/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy } from 'lodash';
import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ReportingCore } from '../../../';
import { LevelLogger } from '../../../lib';
import { createLayout, LayoutParams } from '../../../lib/layouts';
import { ScreenshotResults } from '../../../lib/screenshots';
import { ConditionalHeaders } from '../../common';
import { PdfMaker } from './pdf';
import { getTracker } from './tracker';

const getTimeRange = (urlScreenshots: ScreenshotResults[]) => {
  const grouped = groupBy(urlScreenshots.map((u) => u.timeRange));
  const values = Object.values(grouped);
  if (values.length === 1) {
    return values[0][0];
  }

  return null;
};

export async function generatePdfObservableFactory(reporting: ReportingCore) {
  const config = reporting.getConfig();
  const captureConfig = config.get('capture');
  const getScreenshots = await reporting.getScreenshotsObservable();

  return function generatePdfObservable(
    logger: LevelLogger,
    title: string,
    urls: string[],
    browserTimezone: string | undefined,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams,
    logo?: string
  ): Rx.Observable<{ buffer: Buffer | null; warnings: string[] }> {
    const tracker = getTracker();
    tracker.startLayout();

    const layout = createLayout(captureConfig, layoutParams);
    logger.debug(`Layout: width=${layout.width} height=${layout.height}`);
    tracker.endLayout();

    tracker.startScreenshots();
    const screenshots$ = getScreenshots({
      logger,
      urls,
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      mergeMap(async (results: ScreenshotResults[]) => {
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
            logger.debug(`Adding image to PDF. Image base64 size: ${screenshot.base64EncodedData?.length || 0}`); // prettier-ignore
            tracker.startAddImage();
            tracker.endAddImage();
            pdfOutput.addImage(screenshot.base64EncodedData, {
              title: screenshot.title,
              description: screenshot.description,
            });
          });
        });

        let buffer: Buffer | null = null;
        try {
          tracker.startCompile();
          logger.debug(`Compiling PDF using "${layout.id}" layout...`);
          pdfOutput.generate();
          tracker.endCompile();

          tracker.startGetBuffer();
          logger.debug(`Generating PDF Buffer...`);
          buffer = await pdfOutput.getBuffer();
          logger.debug(`PDF buffer byte length: ${buffer?.byteLength || 0}`);
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
            return found;
          }, [] as string[]),
        };
      })
    );

    return screenshots$;
  };
}
