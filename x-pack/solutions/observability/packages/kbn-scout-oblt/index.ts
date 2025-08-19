/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { test, spaceTest } from './src/playwright';
export type {
  ObltApiServicesFixture,
  ObltPageObjects,
  ObltTestFixtures,
  ObltWorkerFixtures,
  ObltParallelTestFixtures,
  ObltParallelWorkerFixtures,
} from './src/playwright';

// re-export from @kbn/scout
export {
  expect,
  globalSetupHook,
  tags,
  createPlaywrightConfig,
  createLazyPageObject,
} from '@kbn/scout';

export type {
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutPage,
  ScoutServerConfig,
  ScoutTestConfig,
  ScoutPlaywrightOptions,
  ScoutTestOptions,
  Locator,
  SynthtraceFixture,
} from '@kbn/scout';
