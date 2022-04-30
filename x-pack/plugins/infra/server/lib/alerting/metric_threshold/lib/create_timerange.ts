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
  timeframe?: { end: number; start?: number }
) => {
  const to = moment(timeframe ? timeframe.end : Date.now()).valueOf();

  // Rate aggregations need 5 buckets worth of data
  const minimumBuckets = aggType === Aggregators.RATE ? 5 : 1;

  const calculatedFrom = to - interval * minimumBuckets;

  // Use either the timeframe.start when the start is less then calculatedFrom
  // OR use the calculatedFrom
  const from =
    timeframe && timeframe.start && timeframe.start <= calculatedFrom
      ? timeframe.start
      : calculatedFrom;

  return { start: from, end: to };
};
