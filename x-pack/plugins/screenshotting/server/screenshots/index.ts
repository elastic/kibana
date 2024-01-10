/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { Optional } from '@kbn/utility-types';
import { LayoutParams } from '../../common';
import { PerformanceMetrics } from '../../common/types';
import {
  PdfScreenshotOptions,
  PdfScreenshotResult,
  PngScreenshotOptions,
  PngScreenshotResult,
} from '../formats';
import type { ScreenshotObservableOptions, ScreenshotObservableResult } from './observable';

export type { ScreenshotObservableResult, UrlOrUrlWithContext } from './observable';

export interface CaptureOptions extends Optional<ScreenshotObservableOptions, 'urls'> {
  /**
   * Expression to render. Mutually exclusive with `urls`.
   */
  expression?: string | ExpressionAstExpression;
  /**
   * Expression input.
   */
  input?: unknown;
  /**
   * Layout parameters.
   */
  layout?: LayoutParams;
  /**
   * Source Kibana request object from where the headers will be extracted.
   */
  request?: KibanaRequest;
}

export type CaptureMetrics = PerformanceMetrics;

export interface CaptureResult {
  /**
   * Collected performance metrics during the screenshotting session.
   */
  metrics?: CaptureMetrics;
  /**
   * Screenshotting results.
   */
  results: ScreenshotObservableResult[];
}

export type ScreenshotOptions = PdfScreenshotOptions | PngScreenshotOptions;
export type ScreenshotResult = PdfScreenshotResult | PngScreenshotResult;

export { Screenshots } from './screenshots';
