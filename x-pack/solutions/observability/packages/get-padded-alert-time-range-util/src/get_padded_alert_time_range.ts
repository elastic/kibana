/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export interface TimeRange {
  from: string;
  to: string;
}

export const getPaddedAlertTimeRange = (
  alertStart: string,
  alertEnd?: string,
  lookBackWindow?: {
    size: number;
    unit: 's' | 'm' | 'h' | 'd';
  }
): TimeRange => {
  const alertDuration = moment.duration(moment(alertEnd).diff(moment(alertStart)));
  const now = moment().toISOString();

  // If alert duration is less than 160 min, we use 20 minute buffer
  // Otherwise, we use 8 times alert duration
  const defaultDurationMs =
    alertDuration.asMinutes() < 160
      ? moment.duration(20, 'minutes').asMilliseconds()
      : alertDuration.asMilliseconds() / 8;
  // To ensure the alert time range at least covers 20 times lookback window,
  // we compare lookBackDurationMs and defaultDurationMs to use any of those that is longer
  const lookBackDurationMs =
    lookBackWindow &&
    moment.duration(lookBackWindow.size * 20, lookBackWindow.unit).asMilliseconds();
  const durationMs =
    lookBackDurationMs && lookBackDurationMs - defaultDurationMs > 0
      ? lookBackDurationMs
      : defaultDurationMs;

  const from = moment(alertStart).subtract(durationMs, 'millisecond').toISOString();
  const to =
    alertEnd && moment(alertEnd).add(durationMs, 'millisecond').isBefore(now)
      ? moment(alertEnd).add(durationMs, 'millisecond').toISOString()
      : now;

  return {
    from,
    to,
  };
};
