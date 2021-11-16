/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { from, of, Observable } from 'rxjs';
import {
  catchError,
  concatMap,
  first,
  map,
  mergeMap,
  take,
  takeUntil,
  toArray,
} from 'rxjs/operators';
import type { Logger } from 'src/core/server';
import { LayoutParams } from '../../common';
import type { HeadlessChromiumDriverFactory } from '../browsers';
import { createLayout } from '../layouts';
import type { Layout } from '../layouts';
import { ScreenshotObservableHandler } from './observable_handler';
import type { ScreenshotObservableOptions, ScreenshotObservableResult } from './observable_handler';

export interface ScreenshotOptions extends ScreenshotObservableOptions {
  layout: LayoutParams;
}

export interface ScreenshotResult {
  layout: Layout;
  results: ScreenshotObservableResult[];
}

const DEFAULT_SETUP_RESULT = {
  elementsPositionAndAttributes: null,
  timeRange: null,
};

export function getScreenshots$(
  browserDriverFactory: HeadlessChromiumDriverFactory,
  logger: Logger,
  options: ScreenshotOptions
): Observable<ScreenshotResult> {
  const apmTrans = apm.startTransaction('screenshot-pipeline', 'reporting');
  const apmCreateLayout = apmTrans?.startSpan('create-layout', 'setup');
  const layout = createLayout(options.layout);
  logger.debug(`Layout: width=${layout.width} height=${layout.height}`);
  apmCreateLayout?.end();

  const apmCreatePage = apmTrans?.startSpan('create-page', 'wait');
  const {
    browserTimezone,
    timeouts: { openUrl: openUrlTimeout },
  } = options;

  return browserDriverFactory.createPage({ browserTimezone, openUrlTimeout }, logger).pipe(
    mergeMap(({ driver, exit$ }) => {
      apmCreatePage?.end();
      exit$.subscribe({ error: () => apmTrans?.end() });

      const screen = new ScreenshotObservableHandler(driver, logger, layout, options);

      return from(options.urls).pipe(
        concatMap((url, index) =>
          screen.setupPage(index, url, apmTrans).pipe(
            catchError((error) => {
              screen.checkPageIsOpen(); // this fails the job if the browser has closed

              logger.error(error);
              return of({ ...DEFAULT_SETUP_RESULT, error }); // allow failover screenshot capture
            }),
            takeUntil(exit$),
            screen.getScreenshots()
          )
        ),
        take(options.urls.length),
        toArray(),
        map((results) => ({ layout, results }))
      );
    }),
    first()
  );
}
