/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScreenshottingPlugin } from './plugin';

/**
 * Screenshotting plugin entry point.
 */
export function plugin(...args: ConstructorParameters<typeof ScreenshottingPlugin>) {
  return new ScreenshottingPlugin(...args);
}

export { config } from './config';
export type {
  PdfScreenshotOptions,
  PdfScreenshotResult,
  PngScreenshotOptions,
  PngScreenshotResult,
} from './formats';
export type { ScreenshottingStart } from './plugin';
export type { ScreenshotOptions, ScreenshotResult } from './screenshots';
