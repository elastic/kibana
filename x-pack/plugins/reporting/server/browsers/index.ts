/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import { ReportingConfig } from '../';
import { LevelLogger } from '../lib';
import { CaptureConfig } from '../types';
import { chromium, ChromiumArchivePaths } from './chromium';
import { HeadlessChromiumDriverFactory } from './chromium/driver_factory';
import { installBrowser } from './install';

export { chromium } from './chromium';
export { HeadlessChromiumDriver } from './chromium/driver';
export { HeadlessChromiumDriverFactory } from './chromium/driver_factory';

type CreateDriverFactory = (
  binaryPath: string,
  captureConfig: CaptureConfig,
  logger: LevelLogger
) => HeadlessChromiumDriverFactory;

export interface BrowserDownload {
  createDriverFactory: CreateDriverFactory;
  paths: ChromiumArchivePaths;
}

export const initializeBrowserDriverFactory = async (
  config: ReportingConfig,
  logger: LevelLogger
) => {
  const { binaryPath$ } = installBrowser(logger);
  const binaryPath = await binaryPath$.pipe(first()).toPromise();
  const captureConfig = config.get('capture');
  return chromium.createDriverFactory(binaryPath, captureConfig, logger);
};
