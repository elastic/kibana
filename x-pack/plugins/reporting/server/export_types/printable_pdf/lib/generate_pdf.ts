/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import { PdfScreenshotResult } from '@kbn/screenshotting-plugin/server';
import { PdfScreenshotOptions } from '../../../types';
import type { PdfMetrics } from '../../../../common/types';
import { getTracker } from '../../common/pdf_tracker';

interface PdfResult {
  buffer: Uint8Array | null;
  metrics?: PdfMetrics;
  warnings: string[];
}

type GetScreenshotsFn = (options: PdfScreenshotOptions) => Rx.Observable<PdfScreenshotResult>;

export function generatePdfObservable(
  getScreenshots: GetScreenshotsFn,
  options: PdfScreenshotOptions
): Rx.Observable<PdfResult> {
  const tracker = getTracker();
  tracker.startScreenshots();

  return getScreenshots(options).pipe(
    tap(({ metrics }) => {
      if (metrics.cpu) {
        tracker.setCpuUsage(metrics.cpu);
      }
      if (metrics.memory) {
        tracker.setMemoryUsage(metrics.memory);
      }
    }),
    mergeMap(async ({ data: buffer, errors, metrics, renderErrors }) => {
      tracker.endScreenshots();
      const warnings: string[] = [];
      if (errors) {
        warnings.push(...errors.map((error) => error.message));
      }
      if (renderErrors) {
        warnings.push(...renderErrors);
      }

      tracker.end();

      return {
        buffer,
        metrics,
        warnings,
      };
    })
  );
}
