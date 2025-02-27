/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { test, spaceTest } from './src/playwright';
export type {
  ObltPageObjects,
  ObltTestFixtures,
  ObltWorkerFixtures,
  ObltParallelTestFixtures,
  ObltParallelWorkerFixtures,
} from './src/playwright';

// re-export from @kbn/scout
export {
  expect,
  tags,
  createPlaywrightConfig,
  createLazyPageObject,
  ingestTestDataHook,
} from '@kbn/scout';

export type {
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutLogger,
  ScoutPage,
  PageObjects,
  ScoutServerConfig,
  ScoutTestConfig,
  ScoutPlaywrightOptions,
  ScoutTestOptions,
  Locator,
} from '@kbn/scout';
