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
import { REPORTING_TRANSACTION_TYPE } from '../../../common/constants';
import { HeadlessChromiumDriverFactory } from '../../browsers';
import { CaptureConfig } from '../../types';
import {
  ElementPosition,
  ElementsPositionAndAttribute,
  ScreenshotObservableOpts,
  ScreenshotResults,
} from './';
import { ScreenshotObservableHandler } from './observable_handler';

export type { ElementPosition, ElementsPositionAndAttribute, ScreenshotResults };

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

const DEFAULT_SETUP_RESULT = {
  elementsPositionAndAttributes: null,
  timeRange: null,
};

export function getScreenshots$(
  captureConfig: CaptureConfig,
  browserDriverFactory: HeadlessChromiumDriverFactory | null,
  options: ScreenshotObservableOpts
): Rx.Observable<ScreenshotResults[]> {
  const apmTrans = apm.startTransaction('screenshot-pipeline', REPORTING_TRANSACTION_TYPE);
  const { layout } = options;
  const apmCreatePage = apmTrans?.startSpan('create-page', 'wait');
  const { browserTimezone, logger } = options;

  if (!browserDriverFactory) {
    throw new Error(`Browser driver factory is not initialized!`);
  }

  return browserDriverFactory
    .createPage(
      {
        browserTimezone,
        // not provided in 7.17: openUrlTimeout
        defaultViewport: { width: layout.width },
      },
      logger
    )
    .pipe(
      mergeMap(({ driver, exit$ }) => {
        apmCreatePage?.end();
        exit$.subscribe({ error: () => apmTrans?.end() });

        const screen = new ScreenshotObservableHandler(driver, options, getTimeouts(captureConfig));

        return Rx.from(options.urlsOrUrlLocatorTuples).pipe(
          concatMap((urlOrUrlLocatorTuple, index) =>
            screen.setupPage(index, urlOrUrlLocatorTuple, apmTrans).pipe(
              catchError((err) => {
                screen.checkPageIsOpen(); // this fails the job if the browser has closed

                logger.error(err);
                return Rx.of({ ...DEFAULT_SETUP_RESULT, error: err }); // allow failover screenshot capture
              }),
              takeUntil(exit$),
              screen.getScreenshots()
            )
          ),
          take(options.urlsOrUrlLocatorTuples.length),
          toArray()
        );
      }),
      first()
    );
}
