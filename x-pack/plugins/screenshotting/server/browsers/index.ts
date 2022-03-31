/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { download } from './download';
export { install } from './install';
export type { Context, PerformanceMetrics } from './chromium';
export {
  getChromiumDisconnectedError,
  ChromiumArchivePaths,
  DEFAULT_VIEWPORT,
  HeadlessChromiumDriver,
  HeadlessChromiumDriverFactory,
} from './chromium';
