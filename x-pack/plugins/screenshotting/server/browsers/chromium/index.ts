/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getChromiumDisconnectedError = () =>
  new Error(
    i18n.translate('xpack.screenshotting.screencapture.browserWasClosed', {
      defaultMessage: 'Browser was closed unexpectedly! Check the server logs for more info.',
    })
  );

export { ChromiumArchivePaths } from './paths';
export type { ConditionalHeaders } from './driver';
export { HeadlessChromiumDriver } from './driver';
export type { PerformanceMetrics } from './driver_factory';
export { DEFAULT_VIEWPORT, HeadlessChromiumDriverFactory } from './driver_factory';
