/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
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

export const getChromiumDisconnectedError = () =>
  new Error(
    i18n.translate('xpack.reporting.screencapture.browserWasClosed', {
      defaultMessage: 'Browser was closed unexpectedly! Check the server logs for more info.',
    })
  );

export const getDisallowedOutgoingUrlError = (interceptedUrl: string) =>
  new Error(
    i18n.translate('xpack.reporting.chromiumDriver.disallowedOutgoingUrl', {
      defaultMessage: `Received disallowed outgoing URL: "{interceptedUrl}". Failing the request and closing the browser.`,
      values: { interceptedUrl },
    })
  );
