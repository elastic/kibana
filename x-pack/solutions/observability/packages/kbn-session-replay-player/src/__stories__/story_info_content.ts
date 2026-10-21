/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StoryInfoContent {
  /** What the story is for. */
  about: string;
  /** What to look at, including logs and network activity worth checking. */
  notice: string[];
  /** Controls that belong to the story itself, beyond the player's own. */
  controls?: string[];
}

const PLAYER_CONTROLS =
  'The player has its own controls: play and pause, restart, a speed menu, a skip-idle switch, and the timeline (click, drag, or use the arrow, Page Up/Down, Home and End keys).';

/** Keyed by Storybook story id (the part after `--`). */
export const STORY_INFO: Record<string, StoryInfoContent> = {
  default: {
    about:
      'A short checkout journey (product list to checkout form), recorded from a synthetic page and loaded through a paging loader the way a host would.',
    notice: [
      'The clock shows 0:00 / 0:11 once the first page has loaded; playing advances it and the recorded page changes.',
      'Markers on the timeline come from the events themselves: a bar for each page, a dot for each click.',
      'The recorded page is scaled to fit and stays centred when you resize the window.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'with-host-markers': {
    about:
      'The same recording with a marker a host supplied, an error at about 60% of the session.',
    notice: [
      'The red diamond is the host-supplied error; clicking it jumps there and pauses on the frame.',
      'Hover a marker to see its name; screen readers get the kind, the time and the label.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'dense-markers': {
    about: 'Three hundred markers on a short timeline, to show how markers merge when they crowd.',
    notice: [
      'Markers closer than 8 pixels merge into one; resize the window and the grouping changes.',
      'A merged marker takes the kind of the most important marker in it (error, then page, then click), so an error is never hidden behind clicks.',
      'The name of a merged marker says how many events it holds.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'long-session': {
    about:
      'About two hours of recording with a full snapshot every ten minutes, loaded in large pages.',
    notice: [
      'The timeline runs to 1:52:17 and the clock switches to hours.',
      'Turn on Skip idle and press Play: the clock jumps over quiet stretches longer than two seconds.',
      'Seeking far ahead is quick because the whole recording is already loaded.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'progressive-loading': {
    about:
      'The recording arrives in small pages with 300 ms of latency each, as on a slow connection.',
    notice: [
      'Playback starts as soon as the first pages hold a playable start; the lighter part of the track shows what has loaded.',
      'Press End on the timeline straight away: a spinner shows while the rest loads, then playback continues from where you asked.',
      'Letting playback run into the end of what has loaded also waits instead of stopping.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'loader-failure-and-retry': {
    about: 'The third page request fails once, after the recording has already started playing.',
    notice: [
      'The recording stays playable and a notice above the controls offers "Try again".',
      'Retrying asks for the same page again: nothing is applied twice and loading carries on to the end.',
    ],
    controls: ['"Try again" in the notice.', PLAYER_CONTROLS],
  },
  'first-page-failure': {
    about: 'The very first request fails, so there is nothing to play yet.',
    notice: [
      'A full error prompt replaces the player, with the error message.',
      '"Try again" requests the first page again and the player then loads normally.',
    ],
    controls: ['"Try again" in the prompt.'],
  },
  'no-recording': {
    about: 'The host says there is no recording for this session.',
    notice: [
      'The player shows its message and does not call the loader or load rrweb: check the network panel.',
    ],
  },
  'sampled-out': {
    about: 'The host says the session was not selected for recording.',
    notice: ['Same as "No recording", with its own message. The host decides which one applies.'],
  },
  'past-retention': {
    about: 'The host says the recording is older than the retention period.',
    notice: ['Same as "No recording", with its own message. Nothing is loaded.'],
  },
  'no-recording-with-action': {
    about: 'An unavailable recording where the host adds an action under the message.',
    notice: ['The button is whatever the host passes as the action; the player only places it.'],
    controls: ['The "Back to the session" button (does nothing in this story).'],
  },
  'incomplete-recording': {
    about:
      'A recording that holds events but no full snapshot of the page, so there is nothing to show.',
    notice: ['The player says the recording is too short to play instead of failing inside rrweb.'],
  },
  'focus-and-masked-input': {
    about: 'A form with focus changes and inputs masked by the recorder.',
    notice: [
      'Typed values show as masked characters: masking happens when recording, and the player shows what was recorded.',
      'Keyboard focus stays on the controls while the recording plays; the recorded focus does not steal it.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'hostile-content': {
    about:
      'A recorded page that tries to run script and fetch remote content, followed by hand-built events that try every other route.',
    notice: [
      'Open the browser network panel first, then press Play: no request goes to evil.example.',
      'The console only reports the sandbox blocking a script ("Blocked script execution"); no script runs.',
      'The page still renders with its layout, only without the remote images, stylesheets and fonts.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'canvas-images': {
    about: 'A canvas chart recorded as images (the recorder default).',
    notice: [
      'The chart draws while playing; seeking without playing shows the hatched placeholder instead, a limit shared with rrweb.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'canvas-drawing-commands': {
    about: 'A canvas chart recorded as drawing commands.',
    notice: [
      'The chart draws when you play and when you seek, with the page still sandboxed against scripts.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'in-narrow-panel': {
    about: 'The player inside a 320 x 240 box, like a dashboard panel.',
    notice: [
      'The recorded page scales down to fit and the controls wrap onto two rows.',
      'The player fills its parent; the host sets the size.',
    ],
    controls: [PLAYER_CONTROLS],
  },
  'in-flyout': {
    about: 'The player inside an EUI flyout.',
    notice: [
      'Resize the browser window: the flyout and the recorded page refit.',
      'Closing the flyout unmounts the player and stops everything it started.',
    ],
    controls: ['"Open the flyout" reopens it after closing.', PLAYER_CONTROLS],
  },
  'deep-link-and-external-seek': {
    about:
      'A host driving the player from outside: it opens at 0:05 and uses the handle to seek, play, pause and read the position.',
    notice: [
      'The line under the buttons logs every time update the host receives, with its reason (playing, paused, seeked or ended).',
      'While playing, updates come at most four times a second.',
      '"Read position" asks the handle for the current offset at any moment.',
    ],
    controls: [
      'Seek to 0:10, Play, Pause and Read position buttons above the player.',
      PLAYER_CONTROLS,
    ],
  },
  'mount-unmount-stress': {
    about: 'Mounts and unmounts the player every 150 ms, to catch leaks and teardown errors.',
    notice: [
      'The round counter keeps rising and the browser console stays free of errors.',
      'Memory and the number of frames in the page should not grow while it runs.',
    ],
    controls: ['"Mount and unmount quickly" starts and stops the loop.'],
  },
  'session-list-with-thumbnails': {
    about:
      'A list of sessions with a still picture of each recording. The host fetches the first frame of a recording; the thumbnail draws it once, when it first scrolls into view.',
    notice: [
      'While a snapshot is still being fetched, a thumbnail shows a hatched placeholder; once it arrives and the thumbnail is in view, the page appears.',
      'The status line counts rows, snapshots fetched and thumbnails drawn: with a large list and slow fetches, drawn lags behind fetched, and both lag behind the rows.',
      'Drawing itself is local and takes a few milliseconds, so latency only delays the fetch; thumbnails far down the list are not drawn until you scroll to them.',
      'Row 8 has no recording and row 13 fails to load: both keep the placeholder. The hostile page makes no remote request.',
    ],
    controls: [
      'Rows: how many rows the list has.',
      'Fetch latency (ms): the delay of each simulated snapshot request, with some jitter. The list restarts when either control changes.',
    ],
  },
  'thumbnail-states': {
    about: 'Thumbnails side by side: no snapshot, default size and a larger size.',
    notice: [
      'Without a snapshot the thumbnail keeps the hatched placeholder.',
      'The page is scaled to fit the thumbnail and centred, never above its recorded size.',
    ],
  },
};
