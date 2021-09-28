/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingCore } from '../';
import { ReportingConfigType } from '../config';
import { LevelLogger } from '../lib';
import { ChromiumArchivePaths } from './chromium';
import { HeadlessChromiumDriverFactory } from './chromium/driver_factory';

export { chromium } from './chromium';
export { HeadlessChromiumDriver } from './chromium/driver';
export { HeadlessChromiumDriverFactory } from './chromium/driver_factory';

export interface BrowserDownload {
  createDriverFactory: (
    core: ReportingCore,
    captureConfig: ReportingConfigType['capture'],
    logger: LevelLogger
  ) => HeadlessChromiumDriverFactory;
  paths: ChromiumArchivePaths;
}
