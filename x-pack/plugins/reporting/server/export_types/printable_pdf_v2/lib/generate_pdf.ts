/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, zip } from 'lodash';
import * as Rx from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ReportingCore } from '../../../';
import { LocatorParams, UrlOrUrlLocatorTuple } from '../../../../common/types';
import { LevelLogger } from '../../../lib';
import { createLayout, LayoutParams } from '../../../lib/layouts';
import { getScreenshots$, ScreenshotResults } from '../../../lib/screenshots';
import { ConditionalHeaders } from '../../common';
import { PdfMaker } from '../../common/pdf';
import { getFullRedirectAppUrl } from '../../common/v2/get_full_redirect_app_url';
import type { TaskPayloadPDFV2 } from '../types';
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
  const { browserDriverFactory } = await reporting.getPluginStartDeps();

  return function generatePdfObservable(
    logger: LevelLogger,
    job: TaskPayloadPDFV2,
    title: string,
    locatorParams: LocatorParams[],
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

    /**
     * For each locator we get the relative URL to the redirect app
     */
    const urls = locatorParams.map(() => getFullRedirectAppUrl(reporting.getConfig(), job.spaceId));
    const screenshots$ = getScreenshots$(captureConfig, browserDriverFactory, {
      logger,
      urlsOrUrlLocatorTuples: zip(urls, locatorParams) as UrlOrUrlLocatorTuple[],
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
            logger.debug(`Adding image to PDF. Image base64 size: ${screenshot.data.byteLength}`); // prettier-ignore
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
          logger.debug(`Compiling PDF using "${layout.id}" layout...`);
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
            return found;
          }, [] as string[]),
        };
      })
    );

    return screenshots$;
  };
}
