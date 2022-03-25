/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import { ReportingCore } from '../../../';
import { PdfScreenshotOptions } from '../../../types';
import type { PdfMetrics } from '../../../../common/types';
import { getTracker } from '../../common/pdf_tracker';

interface PdfResult {
  buffer: Uint8Array | null;
  metrics?: PdfMetrics;
  warnings: string[];
}

export function generatePdfObservable(
  reporting: ReportingCore,
  options: PdfScreenshotOptions
): Rx.Observable<PdfResult> {
  const tracker = getTracker();
  tracker.startScreenshots();

  return reporting.getScreenshots(options).pipe(
    tap(({ metrics }) => {
      if (metrics) {
        tracker.setCpuUsage(metrics.cpu);
        tracker.setMemoryUsage(metrics.memory);
      }
    }),
    mergeMap(async ({ metrics, result }) => {
      tracker.endScreenshots();
      const warnings: string[] = [];
      if (result.errors) {
        warnings.push(...result.errors.map((error) => error.message));
      }
      if (result.renderErrors) {
        warnings.push(...result.renderErrors);
      }

      tracker.end();

      return {
        buffer: result.data,
        warnings,
        metrics: {
          ...metrics,
          pages: metrics.pageCount,
        },
      };
    })
  );
}
