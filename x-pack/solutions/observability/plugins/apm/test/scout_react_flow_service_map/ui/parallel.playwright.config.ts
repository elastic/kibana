/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

/**
 * Playwright config for React Flow service map tests.
 *
 * This config uses the custom server configuration that enables the
 * serviceMapUseReactFlow feature flag automatically.
 *
 * Run tests (serverless) with:
 * npx playwright test --config=x-pack/solutions/observability/plugins/apm/test/scout_react_flow_service_map/ui/parallel.playwright.config.ts --grep=@local-serverless-observability_complete --project=local
 * or run tests (stateful) with:
 * npx playwright test --config=x-pack/solutions/observability/plugins/apm/test/scout_react_flow_service_map/ui/parallel.playwright.config.ts --grep=@local-stateful-classic --project=local
 */

export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
  runGlobalSetup: true,
});
