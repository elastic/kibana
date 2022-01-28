/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ScreenshotResult } from '../../../../../screenshotting/server';
import { ReportingCore } from '../../../';
import { LevelLogger } from '../../../lib';
import { ScreenshotOptions } from '../../../types';
import { PdfMaker } from '../../common/pdf';
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
): Rx.Observable<{ buffer: Buffer | null; warnings: string[] }> {
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

      let buffer: Buffer | null = null;
      try {
        tracker.startCompile();
        logger.info(`Compiling PDF using "${layout.id}" layout...`);
        pdfOutput.generate();
        tracker.endCompile();

        tracker.startGetBuffer();
        logger.debug(`Generating PDF Buffer...`);
        buffer = await pdfOutput.getBuffer();

        const byteLength = buffer?.byteLength ?? 0;
        logger.debug(`PDF buffer byte length: ${byteLength}`);
        tracker.setByteLength(byteLength);

        tracker.endGetBuffer();
      } catch (err) {
        logger.error(`Could not generate the PDF buffer!`);
        logger.error(err);
      }

      tracker.end();

      return {
        buffer,
        warnings: results.reduce((found, current) => {
          if (current.error) {
            found.push(current.error.message);
          }
          if (current.renderErrors) {
            found.push(...current.renderErrors);
          }
          return found;
        }, [] as string[]),
      };
    })
  );
}
