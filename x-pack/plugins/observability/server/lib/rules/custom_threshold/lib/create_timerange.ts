/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const createTimerange = (
  interval: number,
  timeframe: { end: string; start: string },
  lastPeriodEnd?: number,
  isRateAgg?: boolean
) => {
  const end = moment(timeframe.end).valueOf();
  const start = moment(timeframe.start).valueOf();

  // Rate aggregations need 5 buckets worth of data
  const minimumBuckets = isRateAgg ? 2 : 1;
  const calculatedFrom = lastPeriodEnd ? lastPeriodEnd - interval : end - interval * minimumBuckets;

  // Use lastPeriodEnd - interval when it's less than start
  return {
    start: start <= calculatedFrom ? start : calculatedFrom,
    end,
  };
};
