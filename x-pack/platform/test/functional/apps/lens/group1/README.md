# Lens Group 1 Functional Tests

This directory contains a set of Lens Functional Test Runner (FTR) suites that run against the same shared setup in `index.ts`.

## Shared Setup

`index.ts` is the entry point for this group. It:

- loads the `logstash_functional` Elasticsearch archive;
- sets the browser size used by these UI tests;
- sets the default absolute time range and UTC timezone;
- sets the default Lens data view;
- imports the saved Lens fixtures from `lens_basic.json` and `default.json`;
- loads each focused test file with `loadTestFile(...)`.

## Where To Add Tests

Do not add new tests here. Stateful coverage lives in Scout
(`x-pack/platform/plugins/shared/lens/test/scout/smokescreen`).

The files left in this directory run only for CCS (`config.ccs.ts`):

- `chart_switching.ts`
- `layers.ts`
- `dimension_editor.ts`
- `chart_style_settings.ts`

They remain here because Scout cannot reproduce the cross-cluster-search run yet.

## Running Locally

Stateful coverage is in Scout:

```bash
node scripts/scout.js start-server --arch stateful --domain classic

node scripts/playwright test --project local \
  --config x-pack/platform/plugins/shared/lens/test/scout/smokescreen/ui/parallel.playwright.config.ts
```

The files left in this directory only run in the cross-cluster-search config, so there is no
group-specific FTR config anymore. Run them through `config.ccs.ts`:

```bash
node scripts/functional_tests --config x-pack/platform/test/functional/config.ccs.ts
```
