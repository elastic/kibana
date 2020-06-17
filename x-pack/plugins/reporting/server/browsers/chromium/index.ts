/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BrowserDownload } from '../';
import { CaptureConfig } from '../../../server/types';
import { LevelLogger } from '../../lib';
import { HeadlessChromiumDriverFactory } from './driver_factory';
import { paths } from './paths';

export const chromium: BrowserDownload = {
  paths,
  createDriverFactory: (binaryPath: string, captureConfig: CaptureConfig, logger: LevelLogger) =>
    new HeadlessChromiumDriverFactory(binaryPath, captureConfig, logger),
};
