# @kbn/session-replay-player

Browser-only player for [rrweb](https://github.com/rrweb-io/rrweb) session recordings. The host
supplies the recording and the page around it; this package renders playback, a timeline with
markers, and the states a recording can be in (loading, unavailable, failed).

It does not call Elasticsearch, Kibana core or any HTTP API, and it has no routes. A page, a flyout
or a dashboard panel can all host it.

## Using it

```tsx
import React, { Suspense, useRef } from 'react';
import { SessionReplayPlayer } from '@kbn/session-replay-player';
import type { SessionReplayPlayerHandle } from '@kbn/session-replay-player';

const Replay = ({ sessionId, loadEvents }) => {
  const player = useRef<SessionReplayPlayerHandle>(null);

  return (
    <div style={{ height: 600 }}>
      <Suspense fallback={null}>
        <SessionReplayPlayer
          ref={player}
          sessionId={sessionId}
          recording={{ status: 'available', loadEvents }}
          initialOffsetMs={5_000}
          onTimeUpdate={(offsetMs, reason) => {
            // reason: 'playing' | 'paused' | 'seeked' | 'ended'
          }}
        />
      </Suspense>
    </div>
  );
};
```

The player fills its parent, so give the parent a height. It scales the recorded viewport to fit,
never above its recorded size, and refits when the parent or the recorded viewport changes size.

`SessionReplayPlayer` is lazy: importing the package does not load the player or rrweb. rrweb and
its stylesheet load when the first recording is ready to play.

### Props

| Prop | Meaning |
|---|---|
| `sessionId` | Identity of the recording. Changing it discards the player and starts over. |
| `recording` | Either `{ status: 'available', loadEvents, meta? }` or `{ status: 'unavailable', reason, action? }`. |
| `markers` | Optional `ReplayMarker[]` (`navigation`, `error`, `click`) shown on the timeline. |
| `allowedRemoteOrigins` | Origins recorded content may load images from. See [Remote content](#remote-content). |
| `initialOffsetMs` | Offset of the first frame, for deep links. |
| `onTimeUpdate(offsetMs, reason)` | Reports the position, at most four times a second while playing and once for every pause, seek and end. |

The ref exposes `seek(offsetMs)`, `play()`, `pause()` and `getCurrentOffsetMs()`. The position stays
readable after the player unmounts, so a host can store it when the viewer leaves.

`deriveReplayMarkers(events)` builds navigation and click markers from the events themselves, for
hosts that have no other source.

## Thumbnails

`SessionReplayThumbnail` draws the first frame of a recording as a still picture, for lists. The
host fetches only the start of the recording, takes what the thumbnail needs from it, and passes it
in:

```tsx
import { SessionReplayThumbnail, extractThumbnailSnapshot } from '@kbn/session-replay-player';

const snapshot = extractThumbnailSnapshot(firstPageOfEvents); // undefined if there is nothing to draw

<Suspense fallback={null}>
  <SessionReplayThumbnail snapshot={snapshot} width={160} height={100} />
</Suspense>
```

The page is drawn once, when the thumbnail first scrolls into view, and never updates. Until then,
when there is no snapshot, and when drawing fails, a hatched placeholder shows. The page is drawn
in the same kind of sandboxed frame as the player and its snapshot goes through the same URL policy,
so scripts do not run and remote content is not fetched. Canvases show the placeholder pattern.
`allowedRemoteOrigins` works as it does for the player.

## The recording

The host decides whether a recording exists, and why not. The player does not guess.

```ts
// There is a recording to play.
{ status: 'available', loadEvents, meta: { startTimestamp, endTimestamp } }

// There is not. `reason` selects the message; `action` is rendered under it.
{ status: 'unavailable', reason: 'noRecording' | 'sampledOut' | 'pastRetention', action }
```

`meta` is optional. When given, the timeline shows the full length before everything has loaded and
a seek past what has loaded waits for it instead of stopping short.

### The loader

`loadEvents` pages through the recording:

```ts
type ReplayEventsLoader = (request: {
  cursor?: string;        // absent for the first page
  signal: AbortSignal;    // aborted when the player goes away
}) => Promise<{
  events: ReplayEvent[];  // rrweb events in recording order; pages must not overlap
  nextCursor?: string;    // absent after the last page
}>;
```

- The cursor is opaque. The player returns whatever the loader gave it and nothing else.
- Requests run one at a time, so a cursor can depend on the page before it.
- A failed request is retried with the same cursor. A page is never applied twice.
- A cursor that comes back unchanged ends loading instead of looping forever.
- Playback starts once the first page contains a metadata event, a full snapshot and at least two
  more events. Later pages append while it plays.
- Events that are not rrweb events (types outside 0 to 7) are dropped before rrweb sees them.
- After 50,000 events the player asks whether to keep loading, and asks again after each further
  50,000.

The player never sees compressed payloads or storage chunks. Reassembling them is the host's job.

## What the player does

| Situation | What is shown |
|---|---|
| Loading the first page | A progress prompt. |
| `unavailable` | An empty prompt for the reason, with the host's action. |
| No events, or too few to play | "No recording" or "too short to play". |
| First page fails | An error prompt with a retry. |
| A later page fails | The recording stays playable; a notice offers a retry. |
| Loading stops early | A notice that only part of the recording is available. |
| Seek past what has loaded | Playback waits, shows a spinner, and continues from the target. |
| Playback reaches the end of what has loaded while pages arrive | The same wait, from the end. |
| Skip idle on | Gaps longer than two seconds between events are jumped over. |

The timeline is a slider (arrow keys move five seconds, Page Up and Page Down thirty, Home and End
jump to the ends) with markers above it. Markers closer than eight pixels merge, and a merged
marker takes the colour of the most important kind it holds (error, then navigation, then click).

## Security model

Recorded pages are untrusted input. The player assumes a recording can be hostile.

- **Scripts do not run.** rrweb renders into an iframe with `sandbox="allow-same-origin"` and no
  `allow-scripts`, and the player never relaxes that. rrweb itself refuses to render into an
  unsandboxed document.
- **Canvas replays under the same sandbox.** Canvas events are applied by the player through
  rrweb's `canvasMutation`, so recorded canvases draw without enabling scripts. Canvases recorded
  as images appear while playing; seeking without playing shows a hatched placeholder instead.
  Canvases that were not recorded show the same placeholder.
- **Remote content is not fetched.** The sandbox does not stop network requests, so the player
  rewrites the events before rrweb sees them. See below.
- **Nothing is masked here.** Masking and blocking are the recorder's job; the player shows what
  was recorded.

### Remote content

Every URL in the recording that would make the browser fetch something is removed before it reaches
rrweb: image, media, stylesheet, frame and object sources, `srcset`, CSS `url()`, `@import` and
`image-set()`, SVG references, `<meta http-equiv="refresh">`, and the rrweb-specific `rr_dataURL`.
Elements stay in place so the layout is unchanged.

What survives: `data:` and `blob:` URLs, links (`<a href>`), and URLs whose origin is in
`allowedRemoteOrigins`. Relative and protocol-relative URLs are removed, because the frame has no
base address that means anything for the recording.

Allow an origin only when you trust everything it serves, for example your own CDN:

```tsx
<SessionReplayPlayer allowedRemoteOrigins={['https://cdn.example.com']} {...rest} />
```

Take the list from configuration. Never build it from recorded data.

## Fixtures

`fixtures/` holds recordings of synthetic pages, used by the stories and tests and later by the
host's tests and demo data. See [fixtures/README.md](fixtures/README.md) for what each contains and
how to regenerate them.

## Development

```bash
# Storybook
node scripts/storybook session_replay_player

# Tests
node scripts/jest --config x-pack/solutions/observability/packages/kbn-session-replay-player/jest.config.js
```

Every story has a "What is this story about?" button at the bottom left that explains what to look
at and which controls it has. Stories cover the common cases, long and slow loading, failure and retry, every unavailable state,
dense markers, canvas, hostile content, narrow and flyout layouts, and rapid mounting and
unmounting. The hostile story is the one to open with the browser's network panel visible: nothing
is requested and nothing runs.

### Layout

| Path | Contents |
|---|---|
| `src/model/` | Pure logic: player state, timeline index, skip idle, stage fit, marker layout. |
| `src/model/url_policy/` | The rewrite that removes fetching URLs from events. |
| `src/loading/` | The paging loop and the hook around it. |
| `src/rrweb/` | The only code that imports rrweb, behind a small interface the tests replace. |
| `src/components/` | Stage, controls, timeline and state prompts. |
| `src/thumbnail/` | The thumbnail component and the snapshot it is drawn from. |
| `src/session_replay_player.tsx` | Puts them together. |

rrweb is imported from `src/rrweb/load_rrweb.ts`, and rrweb-snapshot (thumbnails) from
`src/thumbnail/rebuild_thumbnail.ts`; an ESLint rule stops any other package in the repository from
importing either.
