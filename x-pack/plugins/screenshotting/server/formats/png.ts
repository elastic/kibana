/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScreenshotResult, ScreenshotOptions } from '../screenshots';
import type { LayoutParams, LayoutTypes } from '../../common';

export type PngLayoutParams = LayoutParams<typeof LayoutTypes.PRESERVE_LAYOUT>;

export interface PngScreenshotOptions extends ScreenshotOptions {
  layout: PngLayoutParams;
}

export interface PngScreenshotResult extends Omit<ScreenshotResult, 'results'> {
  result: {
    data: Buffer[];
  };
}

export async function toPng(screenshotResult: ScreenshotResult): Promise<PngScreenshotResult> {
  return {
    ...screenshotResult,
    result: {
      data: screenshotResult.results.flatMap((result) =>
        result.screenshots.map((screenshot) => screenshot.data)
      ),
    },
  };
}
