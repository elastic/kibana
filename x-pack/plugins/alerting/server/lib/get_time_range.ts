/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/logging';
import { parseDuration } from '../../common';

export interface GetTimeRangeResult {
  dateStart: string;
  dateEnd: string;
}

interface GetTimeRangeOpts {
  forceNow?: Date;
  logger: Logger;
  queryDelay?: number;
  window?: string;
}

const getWindowDurationInMs = (window?: string): number => {
  let durationInMs: number = 0;
  if (window) {
    try {
      durationInMs = parseDuration(window);
    } catch (err) {
      throw new Error(
        i18n.translate('xpack.alerting.invalidWindowSizeErrorMessage', {
          defaultMessage: 'Invalid format for windowSize: "{window}"',
          values: {
            window,
          },
        })
      );
    }
  }

  return durationInMs;
};

export function getTimeRange({ forceNow, logger, queryDelay, window }: GetTimeRangeOpts) {
  const queryDelayS = queryDelay ?? 0;
  const queryDelayMs = queryDelayS * 1000;
  const timeWindowMs: number = getWindowDurationInMs(window);
  const date = forceNow ? forceNow : new Date();

  logger.debug(`Adjusting rule query time range by ${queryDelayS} seconds`);

  const dateStart = new Date(date.valueOf() - (timeWindowMs + queryDelayMs)).toISOString();
  const dateEnd = new Date(date.valueOf() - queryDelayMs).toISOString();

  return { dateStart, dateEnd };
}
