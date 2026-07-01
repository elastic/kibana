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

Use the file that matches the main behavior under test:

- `chart_creation.ts`: create, save, reopen, change data view, or edit saved visualization metadata.
- `chart_switching.ts`: switch one visualization type to another and verify Lens maps the configuration correctly.
- `layers.ts`: create, duplicate, remove, switch, or validate Lens layers and layer-specific behavior.
- `dimension_editor.ts`: edit dimensions, operations, labels, formats, references, percentile values, or incomplete dimension state.
- `chart_style_settings.ts`: change chart appearance or chart interactions, such as axes, value labels, point visibility, visual options, or legend filtering.
- `ad_hoc_data_view.ts`: flows specific to ad hoc data views.
- `multiple_data_views.ts`: flows involving more than one data view.
- `inspector.ts`: Lens inspector requests and adapter behavior.

If a test touches several areas, place it where the assertion would be most useful to someone debugging a failure. For example, a test that switches chart types only to reach a style setting belongs in `chart_style_settings.ts`, while a test that verifies the chart switch itself belongs in `chart_switching.ts`.

## Running Locally

Run the whole group:

```bash
node scripts/functional_tests --config x-pack/platform/test/functional/apps/lens/group1/config.ts
```

Run a narrower subset with `--grep` using the `describe` or `it` text:

```bash
node scripts/functional_test_runner --config x-pack/platform/test/functional/apps/lens/group1/config.ts --grep "lens chart switching"
```
