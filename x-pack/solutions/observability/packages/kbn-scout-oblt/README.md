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
