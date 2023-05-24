/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import { PdfScreenshotResult } from '@kbn/screenshotting-plugin/server';
import { ReportingServerInfo } from '../../../core';
import { ReportingConfigType } from '../../../config';
import type { LocatorParams, PdfMetrics, UrlOrUrlLocatorTuple } from '../../../../common/types';
import type { PdfScreenshotOptions } from '../../../types';
import { getFullRedirectAppUrl } from '../../common/v2/get_full_redirect_app_url';
import { getTracker } from '../../common/pdf_tracker';
import type { TaskPayloadPDFV2 } from '../types';

interface PdfResult {
  buffer: Uint8Array | null;
  metrics?: PdfMetrics;
  warnings: string[];
}

type GetScreenshotsFn = (options: PdfScreenshotOptions) => Rx.Observable<PdfScreenshotResult>;

export function generatePdfObservable(
  config: ReportingConfigType,
  serverInfo: ReportingServerInfo,
  getScreenshots: GetScreenshotsFn,
  job: TaskPayloadPDFV2,
  locatorParams: LocatorParams[],
  options: Omit<PdfScreenshotOptions, 'urls'>
): Rx.Observable<PdfResult> {
  const tracker = getTracker();
  tracker.startScreenshots();

  /**
   * For each locator we get the relative URL to the redirect app
   */
  const urls = locatorParams.map((locator) => [
    getFullRedirectAppUrl(config, serverInfo, job.spaceId, job.forceNow),
    locator,
  ]) as UrlOrUrlLocatorTuple[];
  const screenshots$ = getScreenshots({ ...options, urls }).pipe(
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

      return {
        buffer,
        metrics,
        warnings,
      };
    })
  );

  return screenshots$;
}
