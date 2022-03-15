/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScreenshotResult, ScreenshotOptions } from '../screenshots';
import { LayoutParams, LayoutTypes } from '../../common';
import { FormattedScreenshotResult } from './types';

const supportedLayouts = [LayoutTypes.PRESERVE_LAYOUT];

/**
 * The layout parameters that are accepted by PNG screenshots
 */
export type PngLayoutParams = LayoutParams<typeof supportedLayouts[number]>;

/**
 * Options that should be provided to a screenshot PNG request
 */
export interface PngScreenshotOptions extends ScreenshotOptions<'png'> {
  layout: PngLayoutParams;
}

/**
 * The final output of a PNG screenshot
 */
export interface PngScreenshotResult extends FormattedScreenshotResult {
  metadata: undefined;
}

export async function toPng({
  layout: _,
  ...rest
}: ScreenshotResult): Promise<PngScreenshotResult> {
  return { ...rest, metadata: undefined };
}
