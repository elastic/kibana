/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, concatMap, first, mergeMap, take, takeUntil, toArray } from 'rxjs/operators';
import { HeadlessChromiumDriverFactory } from '../../browsers';
import { CaptureConfig } from '../../types';
import { ScreenshotObservableHandler } from './observable_handler';
import {
  ElementPosition,
  ElementsPositionAndAttribute,
  PageSetupResults,
  ScreenshotObservableOpts,
  ScreenshotResults,
} from './';

export { ElementPosition, ElementsPositionAndAttribute, ScreenshotResults };

export function getScreenshots$(
  captureConfig: CaptureConfig,
  browserDriverFactory: HeadlessChromiumDriverFactory,
  opts: ScreenshotObservableOpts
): Rx.Observable<ScreenshotResults[]> {
  const apmTrans = apm.startTransaction(`reporting screenshot pipeline`, 'reporting');
  const apmCreatePage = apmTrans?.startSpan('create_page', 'wait');

  const screen = new ScreenshotObservableHandler(captureConfig, opts);

  const viewport = opts.layout.getBrowserViewport();
  const { browserTimezone, logger } = opts;

  return browserDriverFactory.createPage({ viewport, browserTimezone }, logger).pipe(
    mergeMap(({ driver, exit$ }) => {
      apmCreatePage?.end();
      exit$.subscribe({ error: () => apmTrans?.end() });

      return Rx.from(opts.urlsOrUrlLocatorTuples).pipe(
        concatMap((urlOrUrlLocatorTuple, index) => {
          return Rx.of(1).pipe(
            screen.waitUntil('OPEN_URL', screen.openUrl(driver, index, urlOrUrlLocatorTuple)),
            screen.waitUntil('WAIT_FOR_ELEMENTS', screen.waitForElements(driver)),
            screen.waitUntil('RENDER_COMPLETE', screen.completeRender(driver, apmTrans)),
            catchError((err) => {
              screen.checkPageIsOpen(driver); // this fails the job if the browser has closed

              logger.error(err);
              return Rx.of({ ...defaultSetupResult, error: err }); // allow failover screenshot capture
            }),
            takeUntil(exit$),
            screen.getScreenshots(driver)
          );
        }),
        take(opts.urlsOrUrlLocatorTuples.length),
        toArray()
      );
    }),
    first()
  );
}

const defaultSetupResult: PageSetupResults = {
  elementsPositionAndAttributes: null,
  timeRange: null,
};
