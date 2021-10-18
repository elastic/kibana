/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, concatMap, first, mergeMap, take, takeUntil, toArray } from 'rxjs/operators';
import { durationToNumber } from '../../../common/schema_utils';
import { HeadlessChromiumDriverFactory } from '../../browsers';
import { CaptureConfig } from '../../types';
import {
  ElementPosition,
  ElementsPositionAndAttribute,
  PageSetupResults,
  ScreenshotObservableOpts,
  ScreenshotResults,
} from './';
import { ScreenshotObservableHandler } from './observable_handler';

export { ElementPosition, ElementsPositionAndAttribute, ScreenshotResults };

const getTimeouts = (captureConfig: CaptureConfig) => ({
  openUrl: {
    timeoutValue: durationToNumber(captureConfig.timeouts.openUrl),
    configValue: `xpack.reporting.capture.timeouts.openUrl`,
    label: 'open URL',
  },
  waitForElements: {
    timeoutValue: durationToNumber(captureConfig.timeouts.waitForElements),
    configValue: `xpack.reporting.capture.timeouts.waitForElements`,
    label: 'wait for elements',
  },
  renderComplete: {
    timeoutValue: durationToNumber(captureConfig.timeouts.renderComplete),
    configValue: `xpack.reporting.capture.timeouts.renderComplete`,
    label: 'render complete',
  },
  loadDelay: durationToNumber(captureConfig.loadDelay),
});

export function getScreenshots$(
  captureConfig: CaptureConfig,
  browserDriverFactory: HeadlessChromiumDriverFactory,
  opts: ScreenshotObservableOpts
): Rx.Observable<ScreenshotResults[]> {
  const apmTrans = apm.startTransaction(`reporting screenshot pipeline`, 'reporting');
  const apmCreatePage = apmTrans?.startSpan('create_page', 'wait');
  const { browserTimezone, logger } = opts;

  return browserDriverFactory.createPage({ browserTimezone }, logger).pipe(
    mergeMap(({ driver, exit$ }) => {
      apmCreatePage?.end();
      exit$.subscribe({ error: () => apmTrans?.end() });

      const screen = new ScreenshotObservableHandler(driver, opts, getTimeouts(captureConfig));

      return Rx.from(opts.urlsOrUrlLocatorTuples).pipe(
        concatMap((urlOrUrlLocatorTuple, index) => {
          return Rx.of(1).pipe(
            screen.setupPage(index, urlOrUrlLocatorTuple, apmTrans),
            catchError((err) => {
              screen.checkPageIsOpen(); // this fails the job if the browser has closed

              logger.error(err);
              return Rx.of({ ...defaultSetupResult, error: err }); // allow failover screenshot capture
            }),
            takeUntil(exit$),
            screen.getScreenshots()
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
