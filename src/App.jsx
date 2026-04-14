import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'abiding_prayer_ministry_v5';
const SETTINGS_KEY = 'abiding_prayer_settings_v5';
const DONATE_URL = 'https://www.fountainsoflife.org/donate/';
const BELL_URL = 'https://actions.google.com/sounds/v1/alarms/church_bells.ogg';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

function playBell() {
  const audio = new Audio(BELL_URL);
  audio.play().catch(() => {});
}

function calcStreak(entries) {
  const uniqueDays = [...new Set(entries.map((e) => e.date))].sort().reverse();
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const day = cursor.toISOString().slice(0, 10);
    if (uniqueDays.includes(day)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function randomMs(minMinutes, maxMinutes) {
  const min = minMinutes * 60 * 1000;
  const max = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function practiceScore(entry) {
  const count = [entry.thanks, entry.guarded, entry.prayed, entry.grace].filter(Boolean).length;
  return Math.round((count / 4) * 100);
}

function averageScore(entries) {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((sum, entry) => sum + practiceScore(entry), 0) / entries.length);
}

function detectThemes(entries) {
  const joined = entries.map((e) => e.text.toLowerCase()).join(' ');
  return {
    anxiety: (joined.match(/anx|worry|fear|afraid|stress|overwhelm/g) || []).length,
    control: (joined.match(/control|fix|figure out|manage|force/g) || []).length,
    gratitude: (joined.match(/thank|grateful|gratitude|praise/g) || []).length,
    grace: (joined.match(/grace|help me|strength|mercy/g) || []).length,
    conflict: (joined.match(/frustrat|angry|irritat|difficult|complain/g) || []).length,
  };
}

function reflectionSummary(entries) {
  if (!entries.length) {
    return 'Begin with one honest reflection. Abiding grows through simple returning, not pressure.';
  }

  const recent = entries.slice(0, 14);
  const themes = detectThemes(recent);
  const avg = averageScore(recent);
  const strongest = Object.entries(themes).sort((a, b) => b[1] - a[1])[0];

  let themeSentence = 'Your recent reflections show a quiet, steady beginning.';
  if (strongest && strongest[1] > 0) {
    const map = {
      anxiety: 'A repeated theme of anxiety or fear appears in recent reflections.',
      control: 'A repeated theme of trying to manage or control outcomes appears in recent reflections.',
      gratitude: 'Gratitude is becoming a noticeable thread in your recent reflections.',
      grace: 'There is a growing awareness of need and grace in your recent reflections.',
      conflict: 'Relational strain or frustration appears to be an area where God may be inviting deeper surrender.',
    };
    themeSentence = map[strongest[0]];
  }

  let encouragement = 'Keep returning without self-judgment.';
  if (avg >= 75) encouragement = 'There is a beautiful rhythm forming. Stay soft, grateful, and dependent.';
  else if (avg >= 50) encouragement = 'There is real movement here. Let consistency matter more than intensity.';

  return `${themeSentence} ${encouragement}`;
}

function nextInvitation(entries) {
  if (!entries.length) return 'Ask God for grace for the next small thing in front of you.';

  const recent = entries.slice(0, 10);
  const thanksCount = recent.filter((e) => e.thanks).length;
  const guardedCount = recent.filter((e) => e.guarded).length;
  const prayedCount = recent.filter((e) => e.prayed).length;
  const graceCount = recent.filter((e) => e.grace).length;

  const lowest = [
    { label: 'giving thanks in everything', value: thanksCount, prompt: 'Where can you thank God today without denying difficulty?' },
    { label: 'guarding your soul', value: guardedCount, prompt: 'What thought pattern needs to be released instead of rehearsed?' },
    { label: 'talking to God through the day', value: prayedCount, prompt: 'What would it look like to speak to God in the middle of ordinary tasks today?' },
    { label: 'asking for grace', value: graceCount, prompt: 'What task or relationship right now needs grace rather than striving?' },
  ].sort((a, b) => a.value - b.value)[0];

  return `Your next gentle invitation may be ${lowest.label}. ${lowest.prompt}`;
}

function weeklyNarrative(entries) {
  const recent = entries.slice(0, 7);
  if (!recent.length) return 'Your weekly reflection will appear here after a few entries.';

  const avg = averageScore(recent);
  const days = [...new Set(recent.map((e) => e.date))].length;

  if (avg >= 75) {
    return `This week shows a growing rhythm of abiding across ${days} day${days === 1 ? '' : 's'}. There is evidence of gratitude, dependence, and return.`;
  }
  if (avg >= 50) {
    return `This week shows sincere practice across ${days} day${days === 1 ? '' : 's'}. Keep choosing presence over performance.`;
  }
  return `This week may have felt scattered across ${days} day${days === 1 ? '' : 's'}. That is okay. Begin again with simple trust.`;
}

function installMessage(isStandalone) {
  if (isStandalone) return 'Installed on your device.';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIPhone = /iPhone|iPad|iPod/i.test(ua);
  if (isIPhone) return 'To install on iPhone: tap Share, then Add to Home Screen.';
  return 'Install this app from your browser menu or the install button when available.';
}

function getReminderMessage() {
  const messages = [
    'Prayer Break — pause and turn your attention to God’s presence.',
    'Pause and worship God quietly within. He is near.',
    'Return gently to God. Let go and trust Him in this moment.',
    'Ask for grace right now — He is with you.',
    'Turn inward and enjoy God’s presence in secret.',
    'Give thanks here, even in this moment.',
    'Release control and rest in God’s care.',
    'Speak to God now, simply and honestly.',
    'Let your heart turn toward Him again.',
    'Be still and know He is with you.'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function BrandBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-600">
      {children}
    </span>
  );
}

function TabButton({ active, icon, label, onClick }) {
  return (
    <button
      onClick={() => {
        triggerHaptic();
        onClick();
      }}
      className={`relative z-10 flex-1 text-center py-2 rounded-2xl transition-all duration-300 ${active ? 'text-white' : 'text-stone-500'}`}
    >
      <div className="text-lg leading-none">{icon}</div>
      <div className="text-[11px] mt-1">{label}</div>
    </button>
  );
}

export default function JournalingApp() {
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [tabIndex, setTabIndex] = useState(0);
  const [thanks, setThanks] = useState(false);
  const [guarded, setGuarded] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [grace, setGrace] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [meditationMinutes, setMeditationMinutes] = useState(10);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [timerRunning, setTimerRunning] = useState(false);

  const idleTimer = useRef(null);
  const randomTimer = useRef(null);
  const meditationInterval = useRef(null);
  const tabs = ['home', 'instructions', 'journal', 'meditation', 'progress', 'donate', 'settings'];

  useEffect(() => {
    const savedEntries = localStorage.getItem(STORAGE_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);

    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries));
      } catch {}
    }

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setNotificationsEnabled(!!parsed.notificationsEnabled);
      } catch {}
    }

    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone || window.navigator.standalone === true);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ notificationsEnabled }));
  }, [notificationsEnabled]);

  useEffect(() => {
    if ('Notification' in window && notificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    if (!notificationsEnabled) return;

    function scheduleRandom() {
      randomTimer.current = setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Abiding Prayer', {
            body: getReminderMessage(),
          });
        }
        scheduleRandom();
      }, randomMs(45, 120));
    }

    scheduleRandom();
    return () => clearTimeout(randomTimer.current);
  }, [notificationsEnabled]);

  useEffect(() => {
    function resetIdle() {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Abiding Prayer', {
            body: getReminderMessage(),
          });
        }
      }, 20 * 60 * 1000);
    }

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('touchstart', resetIdle);
    resetIdle();

    return () => {
      clearTimeout(idleTimer.current);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
    };
  }, [notificationsEnabled]);

  useEffect(() => {
    setRemainingSeconds(meditationMinutes * 60);
  }, [meditationMinutes]);

  useEffect(() => {
    if (!timerRunning) {
      clearInterval(meditationInterval.current);
      return;
    }

    meditationInterval.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(meditationInterval.current);
          setTimerRunning(false);
          playBell();
          triggerHaptic();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(meditationInterval.current);
  }, [timerRunning]);

  const addEntry = () => {
    if (!text.trim()) return;

    const newEntry = {
      id: Date.now(),
      text,
      date: getToday(),
      thanks,
      guarded,
      prayed,
      grace,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setText('');
    setThanks(false);
    setGuarded(false);
    setPrayed(false);
    setGrace(false);
    triggerHaptic();
    setActiveTab('progress');
    setTabIndex(4);
  };

  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    triggerHaptic();
  };

  const switchTab = (index) => {
    setTabIndex(index);
    setActiveTab(tabs[index]);
  };

  const startMeditation = () => {
    setRemainingSeconds(meditationMinutes * 60);
    playBell();
    triggerHaptic();
    setTimerRunning(true);
  };

  const pauseMeditation = () => {
    setTimerRunning(false);
  };

  const resetMeditation = () => {
    clearInterval(meditationInterval.current);
    setTimerRunning(false);
    setRemainingSeconds(meditationMinutes * 60);
  };

  const streak = useMemo(() => calcStreak(entries), [entries]);
  const avgScore = useMemo(() => averageScore(entries), [entries]);
  const insight = useMemo(() => reflectionSummary(entries), [entries]);
  const invitation = useMemo(() => nextInvitation(entries), [entries]);
  const weekly = useMemo(() => weeklyNarrative(entries), [entries]);
  const installText = useMemo(() => installMessage(isStandalone), [isStandalone]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-100 to-white p-4">
      <div className="max-w-md mx-auto space-y-6 pb-24">
        <div className="bg-stone-900 text-amber-50 rounded-3xl p-5 shadow-2xl border border-stone-700 space-y-4 animate-in fade-in duration-500">
          <div className="space-y-2">
            <BrandBadge>Fountains of Life</BrandBadge>
            <div>
              <h1 className="text-2xl font-serif">Abiding Prayer</h1>
              <p className="text-sm text-amber-100 italic">That I May Know Him</p>
            </div>
          </div>
          <p className="text-sm text-stone-200">A contemplative ministry companion for prayer, surrender, and steady awareness of God’s presence.</p>
          <div className="bg-white/10 rounded-2xl p-4 text-sm space-y-2">
            <p><strong>Goal:</strong> Learning to live continuously in God’s presence and trusting God instead of controlling outcomes.</p>
            <p>{installText}</p>
          </div>
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl border border-stone-500 text-amber-50 py-3 text-center"
          >
            Support Missions
          </a>
        </div>

        {activeTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="bg-white/85 backdrop-blur rounded-3xl border border-stone-200 p-5 shadow-sm space-y-3">
              <BrandBadge>Practice the Presence</BrandBadge>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">How to Practice</p>
              <ul className="space-y-2 text-sm text-stone-700">
                <li>• Give God thanks in everything.</li>
                <li>• Guard your soul from negative dwelling, judgment, and obsession.</li>
                <li>• Talk to God all day long.</li>
                <li>• Ask God for grace for every task.</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-2">Reflection Insight</p>
              <p className="text-stone-700">{insight}</p>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-2">Next Gentle Invitation</p>
              <p className="text-stone-700">{invitation}</p>
            </div>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="bg-stone-900 text-amber-50 rounded-3xl p-5 shadow-2xl border border-stone-700">
              <BrandBadge>Guided Flow</BrandBadge>
              <h2 className="text-2xl font-serif mt-2">Abiding Prayer</h2>
              <p className="text-sm text-amber-100 mt-1">Move slowly. Do not rush. Let each step become prayer.</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Step 1</p>
              <h3 className="font-serif text-lg text-stone-800">Become Aware</h3>
              <p className="text-sm text-stone-700">Turn your attention inward. God is present. You do not need to reach Him—you are with Him now.</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 shadow-sm space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Step 2</p>
              <h3 className="font-serif text-lg text-stone-800">Offer Love</h3>
              <p className="text-sm text-stone-700">Speak simple words to God—love, praise, thanksgiving. Then gently become still before Him.</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Step 3</p>
              <h3 className="font-serif text-lg text-stone-800">Be Still</h3>
              <p className="text-sm text-stone-700">Rest in His presence. When your attention drifts, quietly return with simple words of love.</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 shadow-sm space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Step 4</p>
              <h3 className="font-serif text-lg text-stone-800">Walk With Him</h3>
              <p className="text-sm text-stone-700">Throughout the day, speak to God. Stay aware of Him in ordinary moments.</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Step 5</p>
              <h3 className="font-serif text-lg text-stone-800">Live by Faith</h3>
              <ul className="text-sm text-stone-700 space-y-1">
                <li>• Give thanks in everything</li>
                <li>• Guard your soul</li>
                <li>• Speak with God often</li>
                <li>• Ask for grace in all things</li>
              </ul>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Understanding</p>
              <p className="text-sm text-stone-700">This is not about measuring progress or judging yourself. It is about learning to trust God in your weakness and returning again and again to His presence.</p>
            </div>

            <button
              onClick={() => switchTab(3)}
              className="w-full bg-stone-800 text-white rounded-2xl py-3 shadow-md"
            >
              Begin Prayer Time
            </button>
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="bg-white/92 backdrop-blur rounded-3xl shadow-2xl p-6 space-y-4 border border-stone-200 animate-in fade-in duration-500">
            <div className="text-center space-y-1">
              <BrandBadge>Daily Reflection</BrandBadge>
              <h2 className="text-3xl font-serif text-stone-800">Abiding Prayer</h2>
              <p className="text-sm text-stone-500">Write your prayer, reflection, or gratitude.</p>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 p-4 border rounded-2xl border-stone-200 bg-stone-50"
              placeholder="What happened today, and where is God inviting trust?"
            />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="rounded-xl px-3 py-2 border border-stone-200 flex items-center gap-2 bg-stone-50"><input type="checkbox" checked={thanks} onChange={() => setThanks(!thanks)} /> Gave thanks</label>
              <label className="rounded-xl px-3 py-2 border border-stone-200 flex items-center gap-2 bg-stone-50"><input type="checkbox" checked={guarded} onChange={() => setGuarded(!guarded)} /> Guarded soul</label>
              <label className="rounded-xl px-3 py-2 border border-stone-200 flex items-center gap-2 bg-stone-50"><input type="checkbox" checked={prayed} onChange={() => setPrayed(!prayed)} /> Talked to God</label>
              <label className="rounded-xl px-3 py-2 border border-stone-200 flex items-center gap-2 bg-stone-50"><input type="checkbox" checked={grace} onChange={() => setGrace(!grace)} /> Asked for grace</label>
            </div>

            <button onClick={addEntry} className="w-full bg-stone-800 text-white rounded-2xl py-3 shadow-md active:scale-[0.98] transition-all duration-200">
              Save Entry
            </button>

            <div className="space-y-3">
              {entries.length === 0 ? (
                <p className="text-center text-sm text-stone-400">No entries yet.</p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="border border-stone-200 rounded-2xl p-4 shadow-sm bg-stone-50">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs text-stone-400">{entry.date}</p>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-stone-700">{practiceScore(entry)}%</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-stone-700">{entry.text}</p>
                    <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-stone-500">
                      {entry.thanks && <span className="px-2 py-1 rounded-full bg-white border border-stone-200">Thanks</span>}
                      {entry.guarded && <span className="px-2 py-1 rounded-full bg-white border border-stone-200">Guarded</span>}
                      {entry.prayed && <span className="px-2 py-1 rounded-full bg-white border border-stone-200">Prayed</span>}
                      {entry.grace && <span className="px-2 py-1 rounded-full bg-white border border-stone-200">Grace</span>}
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} className="mt-3 text-red-500 text-sm">
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'meditation' && (
          <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-5 shadow-xl animate-in fade-in duration-500 text-center">
            <BrandBadge>Meditation Prayer</BrandBadge>
            <h2 className="font-serif text-2xl text-stone-800">Meditation Prayer Timer</h2>
            <p className="text-stone-600">Set a time to become still before God. The timer begins and ends with a church bell.</p>

            <div className="rounded-3xl bg-stone-900 text-amber-50 p-8 shadow-inner">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200 mb-3">Remaining Time</p>
              <p className="text-5xl font-serif">{formatTime(remainingSeconds)}</p>
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-sm text-stone-600">Minutes</label>
              <input
                type="range"
                min="1"
                max="60"
                value={meditationMinutes}
                onChange={(e) => setMeditationMinutes(Number(e.target.value))}
                disabled={timerRunning}
                className="w-full"
              />
              <p className="text-center text-stone-700 font-medium">{meditationMinutes} minute{meditationMinutes === 1 ? '' : 's'}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button onClick={startMeditation} disabled={timerRunning} className="rounded-2xl bg-stone-800 text-white py-3 disabled:opacity-50">
                Begin
              </button>
              <button onClick={pauseMeditation} disabled={!timerRunning} className="rounded-2xl border border-stone-200 py-3 disabled:opacity-50">
                Pause
              </button>
              <button onClick={resetMeditation} className="rounded-2xl border border-stone-200 py-3">
                Reset
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-left text-sm text-stone-700">
              <p className="font-medium mb-2">Prayer Suggestion</p>
              <p>Be still before God. Turn your attention inward, worship Him from the depths of your spirit, and enjoy Him there in secret.</p>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white border border-stone-200 p-5 shadow-sm text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Streak</p>
                <p className="text-3xl mt-2">🔥 {streak}</p>
              </div>
              <div className="rounded-3xl bg-white border border-stone-200 p-5 shadow-sm text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Average Score</p>
                <p className="text-3xl mt-2">{avgScore}%</p>
              </div>
            </div>

            <div className="rounded-3xl bg-amber-50 border border-amber-100 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-2">Weekly Reflection</p>
              <p className="text-stone-700">{weekly}</p>
            </div>

            <div className="rounded-3xl bg-white border border-stone-200 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-2">Pattern Discernment</p>
              <p className="text-stone-700">{insight}</p>
            </div>
          </div>
        )}

        {activeTab === 'donate' && (
          <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-4 shadow-xl animate-in fade-in duration-500 text-center">
            <BrandBadge>Support the Mission</BrandBadge>
            <h2 className="font-serif text-2xl text-stone-800">Partner With Fountains of Life</h2>
            <p className="text-stone-600">Support this ministry and the ongoing work of sharing prayer, spiritual formation, and mission outreach.</p>
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-2xl bg-stone-800 text-white py-3 shadow-md"
            >
              Donate to Our Missions Work
            </a>
            <p className="text-xs text-stone-400">You will be taken to the Fountains of Life donation page.</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-4 shadow-xl animate-in fade-in duration-500">
            <h2 className="font-serif text-xl text-stone-800">Settings</h2>
            <div className="rounded-2xl border border-stone-200 px-4 py-3 space-y-2">
              <div className="flex justify-between items-center">
                <span>Smart Reminders</span>
                <input type="checkbox" checked={notificationsEnabled} onChange={() => setNotificationsEnabled(!notificationsEnabled)} />
              </div>
              <p className="text-xs text-stone-500">Prayer Break - pause often throughout the day to worship God from the depths of your spirit and enjoy Him there in secret.</p>
            </div>
            <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-sm text-stone-600">
              <p>{installText}</p>
            </div>
          </div>
        )}

        <div className="sticky bottom-3 max-w-md mx-auto bg-white/95 backdrop-blur border border-stone-200 rounded-3xl shadow-lg px-1 py-2 flex justify-around overflow-hidden">
          <div className="absolute top-2 bottom-2 rounded-2xl bg-stone-800 transition-all duration-300" style={{ left: `${tabIndex * (100 / 7)}%`, width: `${100 / 7}%` }} />
          <TabButton active={activeTab === 'home'} icon="🏠" label="Home" onClick={() => switchTab(0)} />
          <TabButton active={activeTab === 'instructions'} icon="🕊️" label="Guide" onClick={() => switchTab(1)} />
          <TabButton active={activeTab === 'journal'} icon="📖" label="Journal" onClick={() => switchTab(2)} />
          <TabButton active={activeTab === 'meditation'} icon="⏳" label="Prayer" onClick={() => switchTab(3)} />
          <TabButton active={activeTab === 'progress'} icon="📈" label="Progress" onClick={() => switchTab(4)} />
          <TabButton active={activeTab === 'donate'} icon="🤍" label="Donate" onClick={() => switchTab(5)} />
          <TabButton active={activeTab === 'settings'} icon="⚙️" label="Settings" onClick={() => switchTab(6)} />
        </div>
      </div>
    </div>
  );
}
