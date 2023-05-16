/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import type { ReportingExportTypesCore } from '@kbn/reporting-export-types-core';
import { PdfMetrics } from '@kbn/reporting-common/metrics';
import { PdfScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import { LocatorParams } from '@kbn/reporting-plugin/common';
import { getTracker } from '@kbn/reporting-plugin/server/export_types/common';
import { UrlOrUrlLocatorTuple } from '@kbn/reporting-plugin/common/types';
import { getFullRedirectAppUrl } from '@kbn/reporting-plugin/server/export_types/common/v2/get_full_redirect_app_url';
import { TaskPayloadPDFV2 } from './printable_pdfs_v2';

interface PdfResult {
  buffer: Uint8Array | null;
  metrics?: PdfMetrics;
  warnings: string[];
}

export function generatePdfObservable(
  reporting: ReportingExportTypesCore,
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
    getFullRedirectAppUrl(reporting, job.spaceId, job.forceNow),
    locator,
  ]) as UrlOrUrlLocatorTuple[];
  const screenshots$ = reporting.getScreenshots({ ...options, urls }).pipe(
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
