/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { finalize, map, tap } from 'rxjs/operators';
import { ReportingCore } from '../../';
import { UrlOrUrlLocatorTuple } from '../../../common/types';
import { LevelLogger } from '../../lib';
import { LayoutParams, PreserveLayout } from '../../lib/layouts';
import { getScreenshots$, ScreenshotResults } from '../../lib/screenshots';
import { ConditionalHeaders } from '../common';

export async function generatePngObservableFactory(reporting: ReportingCore) {
  const config = reporting.getConfig();
  const captureConfig = config.get('capture');
  const { browserDriverFactory } = await reporting.getPluginStartDeps();

  return function generatePngObservable(
    logger: LevelLogger,
    urlOrUrlLocatorTuple: UrlOrUrlLocatorTuple,
    browserTimezone: string | undefined,
    conditionalHeaders: ConditionalHeaders,
    layoutParams: LayoutParams
  ): Rx.Observable<{ buffer: Buffer; warnings: string[] }> {
    const apmTrans = apm.startTransaction('reporting generate_png', 'reporting');
    const apmLayout = apmTrans?.startSpan('create_layout', 'setup');
    if (!layoutParams || !layoutParams.dimensions) {
      throw new Error(`LayoutParams.Dimensions is undefined.`);
    }
    const layout = new PreserveLayout(layoutParams.dimensions);
    if (apmLayout) apmLayout.end();

    const apmScreenshots = apmTrans?.startSpan('screenshots_pipeline', 'setup');
    let apmBuffer: typeof apm.currentSpan;
    const screenshots$ = getScreenshots$(captureConfig, browserDriverFactory, {
      logger,
      urlsOrUrlLocatorTuples: [urlOrUrlLocatorTuple],
      conditionalHeaders,
      layout,
      browserTimezone,
    }).pipe(
      tap(() => {
        apmScreenshots?.end();
        apmBuffer = apmTrans?.startSpan('get_buffer', 'output') ?? null;
      }),
      map((results: ScreenshotResults[]) => ({
        buffer: results[0].screenshots[0].data,
        warnings: results.reduce((found, current) => {
          if (current.error) {
            found.push(current.error.message);
          }
          return found;
        }, [] as string[]),
      })),
      tap(({ buffer }) => {
        logger.debug(`PNG buffer byte length: ${buffer.byteLength}`);
        apmTrans?.setLabel('byte_length', buffer.byteLength, false);
      }),
      finalize(() => {
        apmBuffer?.end();
        apmTrans?.end();
      })
    );

    return screenshots$;
  };
}
