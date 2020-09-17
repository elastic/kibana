/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { LevelLogger } from '../lib';
import { CaptureConfig } from '../types';
import { chromium } from './chromium';
import { HeadlessChromiumDriverFactory } from './chromium/driver_factory';
import { installBrowser } from './install';
import { ReportingConfig } from '..';

export { HeadlessChromiumDriver } from './chromium/driver';
export { HeadlessChromiumDriverFactory } from './chromium/driver_factory';
export { chromium } from './chromium';

type CreateDriverFactory = (
  binaryPath: string,
  captureConfig: CaptureConfig,
  logger: LevelLogger
) => HeadlessChromiumDriverFactory;

export interface BrowserDownload {
  createDriverFactory: CreateDriverFactory;
  paths: {
    archivesPath: string;
    baseUrl: string;
    packages: Array<{
      archiveChecksum: string;
      archiveFilename: string;
      binaryChecksum: string;
      binaryRelativePath: string;
      platforms: string[];
    }>;
  };
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
