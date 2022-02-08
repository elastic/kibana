/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ReportingCore } from '../../../';
import { ScreenshotResult } from '../../../../../screenshotting/server';
import { LevelLogger } from '../../../lib';
import { ScreenshotOptions } from '../../../types';
import {
  PdfMaker,
  PdfWorkerOutOfMemoryError,
  extractScreenshotResultErrors,
} from '../../common/pdf';
import { getTracker } from './tracker';

const getTimeRange = (urlScreenshots: ScreenshotResult['results']) => {
  const grouped = groupBy(urlScreenshots.map(({ timeRange }) => timeRange));
  const values = Object.values(grouped);
  if (values.length === 1) {
    return values[0][0];
  }

  return null;
};

export function generatePdfObservable(
  reporting: ReportingCore,
  logger: LevelLogger,
  title: string,
  options: ScreenshotOptions,
  logo?: string
): Rx.Observable<{ buffer: Uint8Array | null; warnings: string[] }> {
  const tracker = getTracker();
  tracker.startScreenshots();

  return reporting.getScreenshots(options).pipe(
    mergeMap(async ({ layout, metrics$, results }) => {
      metrics$.subscribe(({ cpu, memory }) => {
        tracker.setCpuUsage(cpu);
        tracker.setMemoryUsage(memory);
      });
      tracker.endScreenshots();
      tracker.startSetup();

      const pdfOutput = new PdfMaker(layout, logo);
      if (title) {
        const timeRange = getTimeRange(results);
        title += timeRange ? ` - ${timeRange}` : '';
        pdfOutput.setTitle(title);
      }
      tracker.endSetup();

      results.forEach((r) => {
        r.screenshots.forEach((screenshot) => {
          logger.debug(`Adding image to PDF. Image size: ${screenshot.data.byteLength}`); // prettier-ignore
          tracker.startAddImage();
          tracker.endAddImage();
          pdfOutput.addImage(screenshot.data, {
            title: screenshot.title ?? undefined,
            description: screenshot.description ?? undefined,
          });
        });
      });

      const warnings = extractScreenshotResultErrors(results);

      let buffer: Uint8Array | null = null;
      try {
        tracker.startCompile();
        logger.info(`Compiling PDF using "${layout.id}" layout...`);
        buffer = await pdfOutput.generate();
        tracker.endCompile();

        logger.debug(`Generating PDF Buffer...`);

        const byteLength = buffer?.byteLength ?? 0;
        logger.debug(`PDF buffer byte length: ${byteLength}`);
        tracker.setByteLength(byteLength);
      } catch (err) {
        logger.error(`Could not generate the PDF buffer!`);
        logger.error(err);
        if (err instanceof PdfWorkerOutOfMemoryError) {
          warnings.push(
            'Failed to generate PDF due to low memory. Please consider generating a smaller PDF.'
          );
        }
      }

      tracker.end();

      return {
        buffer,
        warnings,
      };
    })
  );
}
