/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import moment from 'moment';

import { APPROXIMATE_TIME_REMAINING, ABOVE_THE_AVERAGE_TIME } from '../translations';

export const MAX_SECONDS_BADGE_WIDTH = 64; // px

export const getAverageIntervalSeconds = (intervals: GenerationInterval[]) => {
  const intervalSeconds = intervals.map((interval) => interval.durationMs / 1000);

  if (intervalSeconds.length === 0) {
    return 0;
  }

  const average =
    intervalSeconds.reduce((acc, seconds) => acc + seconds, 0) / intervalSeconds.length;

  return Math.trunc(average);
};

export const getTimerPrefix = (approximateFutureTime: Date | null) => {
  if (approximateFutureTime == null) {
    return APPROXIMATE_TIME_REMAINING;
  }

  const now = moment();

  return moment(approximateFutureTime).isSameOrAfter(now)
    ? APPROXIMATE_TIME_REMAINING
    : ABOVE_THE_AVERAGE_TIME;
};
