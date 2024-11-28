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
  timeframe: { end: string; start: string },
  lastPeriodEnd?: number
) => {
  const end = moment(timeframe.end).valueOf();
  let start = moment(timeframe.start).valueOf();

  // Rate aggregations need 5 buckets worth of data
  const minimumBuckets = aggType === Aggregators.RATE ? 2 : 1;

  interval = interval * minimumBuckets;
  start = start - interval;

  // Use lastPeriodEnd - interval when it's less than start
  if (lastPeriodEnd && lastPeriodEnd - interval < start) {
    start = lastPeriodEnd - interval;
  }
  return { start, end };
};
