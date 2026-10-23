# Replay fixtures

Recorded rrweb events used by the player's Storybook stories and Jest tests, and later by the host
plugin's Scout test and demo-data loader. They contain no customer data: every page is a synthetic
HTML file in `source/`, all addresses are rewritten to `https://shop.example/` (or
`https://evil.example/` for the hostile page), and inputs are masked by the recorder.

## Files

| Fixture | Source page | Purpose |
|---|---|---|
| `checkout_flow.json` | `shop_list.html` → `checkout.html` | Default story, markers, skip idle (two 5 s idle gaps), the recorder's synthetic `type: 99` marker |
| `long_session.json` | derived from `checkout_flow` | About two hours with a full snapshot every ten minutes: long timelines and windowed-loading design |
| `focus_and_input.json` | `checkout.html` | Focus events and masked inputs |
| `canvas_chart.json` | `canvas_chart.html` | Canvas image snapshots (the recorder's default `sampling.canvas`) |
| `canvas_commands.json` | `canvas_chart.html` | Canvas drawing commands (no canvas sampling) |
| `hostile_content.json` | `hostile.html` + hand-built events | A recorded hostile page followed by events assembled by hand (`scripts/hostile_events.ts`) that try every path to fetch remote content or run code; they model a hostile writer, not a real recorder |
| `thumb_*.json` | `shop_list`, `checkout`, `data_table`, `article`, `error_page` | First frame only (viewport event plus full snapshot), for thumbnails |

## Regenerating

```bash
node x-pack/solutions/observability/packages/kbn-session-replay-player/scripts/generate_fixtures.js
node x-pack/solutions/observability/packages/kbn-session-replay-player/scripts/generate_fixtures.js --only checkout_flow
```

The script drives Chromium through the `playwright` package Kibana already provides, injects
rrweb's own recorder with the replay recorder's defaults, replays a scripted journey and writes
the events with timestamps shifted to a fixed base so regenerated files stay stable. Set
`CHROME_EXECUTABLE` to use a specific browser binary. All remote requests are aborted while
recording.

## Budgets

`src/fixtures.test.ts` enforces a size budget per file (about 1.5 MB in total), valid events,
non-decreasing timestamps, a viewport event and a full snapshot, and that no file contains a local
path, an e-mail address or an address outside the two synthetic hosts.
