/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaptureResult, CaptureOptions } from '../screenshots';
import type { LayoutParams } from '../../common';
import { LayoutTypes } from '../../common';

/**
 * The layout parameters that are accepted by PNG screenshots
 */
export type PngLayoutParams = LayoutParams<LayoutTypes.PRESERVE_LAYOUT>;

/**
 * Options that should be provided to a screenshot PNG request
 */
export interface PngScreenshotOptions extends CaptureOptions {
  /**
   * Whether to format the output as a PNG.
   * @default 'png'
   */
  format?: 'png';

  layout: PngLayoutParams;
}

/**
 * The final output of a PNG screenshot
 */
export type PngScreenshotResult = CaptureResult;

export async function toPng(result: CaptureResult): Promise<PngScreenshotResult> {
  return result;
}
