/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import { ReportingCore } from '../../../../';
import { LevelLogger } from '../../../../lib';
import { ConditionalHeaders, ScreenshotResults } from '../../../../types';
import { LayoutParams } from '../../../common/layouts';
import { PreserveLayout } from '../../../common/layouts/preserve_layout';

export async function generatePngObservableFactory(reporting: ReportingCore) {
  const getScreenshots = await reporting.getScreenshotsObservable();

  return function generatePngObservable(
    logger: LevelLogger,
    url: string,
    browserTimezone: string,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams
  ): Rx.Observable<{ base64: string | null; warnings: string[] }> {
    const apmTrans = apm.startTransaction('reporting generate_png', 'reporting');
    const apmLayout = apmTrans?.startSpan('create_layout', 'setup');
    if (!layoutParams || !layoutParams.dimensions) {
      throw new Error(`LayoutParams.Dimensions is undefined.`);
    }
    const layout = new PreserveLayout(layoutParams.dimensions);
    if (apmLayout) apmLayout.end();

    const apmScreenshots = apmTrans?.startSpan('screenshots_pipeline', 'setup');
    const screenshots$ = getScreenshots({
      logger,
      urls: [url],
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      map((results: ScreenshotResults[]) => {
        if (apmScreenshots) apmScreenshots.end();
        if (apmTrans) apmTrans.end();

        return {
          base64: results[0].screenshots[0].base64EncodedData,
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
