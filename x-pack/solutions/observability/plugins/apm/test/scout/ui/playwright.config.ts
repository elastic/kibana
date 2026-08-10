/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '@kbn/scout-oblt';

// Sequential lane (workers: 1) for suites that mutate global state (the
// `apm-indices` saved object, space-level advanced settings). Running them on a
// dedicated server, one file at a time, keeps them from clobbering the parallel
// data suites in `parallel.playwright.config.ts`.
export default createPlaywrightConfig({
  testDir: './tests',
  runGlobalSetup: true,
});
