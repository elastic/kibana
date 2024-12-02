/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Aggregators } from '../../../../../common/alerting/metrics';

export const createTimerange = (
  interval: number,
  aggType: Aggregators,
  timeframe?: { end: number; start?: number },
  lastPeriodEnd?: number
) => {
  const to = moment(timeframe ? timeframe.end : Date.now()).valueOf();

  // Rate aggregations need 5 buckets worth of data
  const minimumBuckets = aggType === Aggregators.RATE ? 2 : 1;

  interval = interval * minimumBuckets;
  let calculatedFrom = to - interval;

  if (lastPeriodEnd) {
    const maxAllowedLookBack = moment(calculatedFrom).subtract(3 * interval, 'ms');
    // Calculate the maximum allowable look-back time (3 intervals before the current 'calculatedFrom' time).
    if (moment(lastPeriodEnd).isAfter(maxAllowedLookBack)) {
      // Ensure lastPeriodEnd is within the allowable look-back range.
      calculatedFrom = lastPeriodEnd - interval;
    }
  }

  const from =
    timeframe && timeframe.start && timeframe.start <= calculatedFrom
      ? timeframe.start
      : calculatedFrom;
  return { start: from, end: to };
};
