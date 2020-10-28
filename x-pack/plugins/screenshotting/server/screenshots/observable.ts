/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { from, of, Observable } from 'rxjs';
import { catchError, concatMap, first, mergeMap, take, takeUntil, toArray } from 'rxjs/operators';
import type { Logger } from 'src/core/server';
import type { HeadlessChromiumDriverFactory } from '../browsers';
import type { PageSetupResults, ScreenshotObservableOptions, ScreenshotResults } from '.';
import { ScreenshotObservableHandler } from './observable_handler';

const defaultSetupResult: PageSetupResults = {
  elementsPositionAndAttributes: null,
  timeRange: null,
};

export function getScreenshots$(
  browserDriverFactory: HeadlessChromiumDriverFactory,
  logger: Logger,
  options: ScreenshotObservableOptions
): Observable<ScreenshotResults[]> {
  const apmTrans = apm.startTransaction('screenshot-pipeline', 'reporting');
  const apmCreatePage = apmTrans?.startSpan('create-page', 'wait');
  const {
    browserTimezone,
    timeouts: { openUrl: openUrlTimeout },
  } = options;

  return browserDriverFactory.createPage({ browserTimezone, openUrlTimeout }, logger).pipe(
    mergeMap(({ driver, exit$ }) => {
      apmCreatePage?.end();
      exit$.subscribe({ error: () => apmTrans?.end() });

      const screen = new ScreenshotObservableHandler(driver, logger, options);

      return from(options.urls).pipe(
        concatMap((url, index) =>
          screen.setupPage(index, url, apmTrans).pipe(
            catchError((err) => {
              screen.checkPageIsOpen(); // this fails the job if the browser has closed

              logger.error(err);
              return of({ ...defaultSetupResult, error: err }); // allow failover screenshot capture
            }),
            takeUntil(exit$),
            screen.getScreenshots()
          )
        ),
        take(options.urls.length),
        toArray()
      );
    }),
    first()
  );
}
