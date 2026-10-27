# @kbn/scout-oblt

`@kbn/scout-oblt` is a test library that extends `@kbn/scout` with test helpers specifically designed for `Observability` products in Kibana.

Its primary goal is to simplify the test development experience for teams working on `Observability` plugins by providing custom Playwright fixtures, page objects, and utilities tailored for Observability-related testing scenarios.

### Table of Contents

1. Folder Structure
2. How to Use
3. Contributing

### Folder Structure

The `@kbn/scout-oblt` structure includes the following key directories and files:

```
x-pack/solutions/observability/packages/kbn-scout-oblt/
├── src/
│   ├── playwright/
│   │   └── fixtures
│   │   │   └── test/
│   │   │   │   └── // Observability test-scope fixtures
│   │   │   └── worker/
│   │   │   │   └── // Observability worker-scope fixtures
│   │   │   └── single_thread_fixtures.ts
│   │   │   └── parallel_run_fixtures.ts
│   │   │   └── index.ts
│   │   └── page_objects/
│   │   │   └── // Observability pages
│   └── index.ts
├── package.json
├── tsconfig.json
```

### How to use

```
import { test } from '@kbn/scout-oblt';

test('verifies Observability Home loads', async ({ page, pageObjects }) => {
  await pageObjects.onboardingHome.goto();
  expect(await page.title()).toContain('Observability');
});
```

### Architecture tags

Tag each top-level `describe` with the architecture(s) a suite covers, using `tags` from
`@kbn/scout-oblt`:

- `tags.stateful.classic` — stateful-only (ECK/on-prem) deployments.
- `tags.serverless.observability.complete` / `tags.serverless.observability.logs_essentials` —
  the Observability serverless project tiers.
- `tags.deploymentAgnostic` — covers both stateful and serverless; prefer this when the
  feature behaves identically everywhere.

`@kbn/eslint/scout_prefer_both_arch_tags` warns when a suite tags only one architecture,
nudging you to add the other unless the feature is genuinely unavailable there. If a suite
is deliberately single-architecture (e.g. a feature that only exists in one serverless tier),
suppress the warning with a reason instead of leaving it as unexplained noise:

```ts
// eslint-disable-next-line @kbn/eslint/scout_prefer_both_arch_tags -- logs_essentials doesn't ship this feature yet
```

Whole plugins that are single-architecture by design (e.g. `uptime`, `serverless_observability`)
are excluded from the rule entirely in `.oxlint/scout.mts` — no per-file disable needed there.
