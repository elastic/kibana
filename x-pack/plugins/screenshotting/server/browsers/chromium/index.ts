/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getChromiumDisconnectedError = () =>
  new Error('Browser was closed unexpectedly! Check the server logs for more info.');

export { HeadlessChromiumDriver } from './driver';
export type { Context } from './driver';
export { DEFAULT_VIEWPORT, HeadlessChromiumDriverFactory } from './driver_factory';
export type { PerformanceMetrics } from './driver_factory';
export { ChromiumArchivePaths } from './paths';
export type { PackageInfo } from './paths';
