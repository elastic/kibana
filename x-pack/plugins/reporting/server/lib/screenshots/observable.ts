/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, concatMap, first, mergeMap, take, takeUntil, toArray } from 'rxjs/operators';
import { ContentStream } from '..';
import { LAYOUT_TYPES } from '../../../common/constants';
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

export type { ElementPosition, ElementsPositionAndAttribute };

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
  stream: ContentStream | null,
  opts: ScreenshotObservableOpts
): Rx.Observable<ScreenshotResults[]> {
  const apmTrans = apm.startTransaction(`reporting screenshot pipeline`, 'reporting');
  const apmCreatePage = apmTrans?.startSpan('create_page', 'wait');
  const { browserTimezone, logger } = opts;

  const useStream = opts.layout.id === LAYOUT_TYPES.PNG;
  if (useStream && !stream) {
    throw new TypeError('stream must be defined when layout type is PNG');
  }

  return browserDriverFactory.createPage({ browserTimezone }, logger).pipe(
    mergeMap(({ driver, exit$ }) => {
      apmCreatePage?.end();
      exit$.subscribe({ error: () => apmTrans?.end() });

      const screen = new ScreenshotObservableHandler(driver, opts, getTimeouts(captureConfig));

      return Rx.from(opts.urlsOrUrlLocatorTuples).pipe(
        concatMap((urlOrUrlLocatorTuple, index) =>
          screen.setupPage(index, urlOrUrlLocatorTuple, apmTrans).pipe(
            catchError((err) => {
              screen.checkPageIsOpen(); // this fails the job if the browser has closed

              logger.error(err);
              return Rx.of({ ...defaultSetupResult, error: err }); // allow failover screenshot capture
            }),
            takeUntil(exit$),
            useStream ? screen.streamScreenshots(stream as ContentStream) : screen.getScreenshots()
          )
        ),
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
