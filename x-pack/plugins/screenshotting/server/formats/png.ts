/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScreenshotResult, ScreenshotOptions } from '../screenshots';
import { LayoutParams, LayoutTypes } from '../../common';

const supportedLayouts = [LayoutTypes.PRESERVE_LAYOUT];

export type PngLayoutParams = LayoutParams<typeof supportedLayouts[number]>;

export interface PngScreenshotOptions extends ScreenshotOptions {
  layout: PngLayoutParams;
}

export type PngScreenshotResult = Omit<ScreenshotResult, 'layout'>;

export async function toPng(screenshotResult: ScreenshotResult): Promise<PngScreenshotResult> {
  return screenshotResult as PngScreenshotResult;
}
