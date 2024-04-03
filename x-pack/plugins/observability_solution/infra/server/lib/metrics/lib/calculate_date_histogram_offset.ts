/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsAPITimerange } from '../../../../common/http_api';
import { calculateBucketSize } from './calculate_bucket_size';

export const calculateDateHistogramOffset = (timerange: MetricsAPITimerange): string => {
  const fromInSeconds = Math.floor(timerange.from / 1000);
  const { bucketSize } = calculateBucketSize(timerange);

  // negative offset to align buckets with full intervals (e.g. minutes)
  const offset = (fromInSeconds % bucketSize) - bucketSize;

  // Because everything is being rounded to the nearest second, except the timerange,
  // we need to adjust the buckets to account for the millisecond offset otherwise
  // the last bucket will be only contain the difference.
  const millisOffset = timerange.to % 1000;
  return `${offset * 1000 - millisOffset}ms`;
};
