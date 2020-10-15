/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsAPITimerange } from '../../../../common/http_api';
import { calculateBucketSize } from './calculate_bucket_size';

export const calculateDateHistogramOffset = (timerange: MetricsAPITimerange): string => {
  const fromInSeconds = Math.floor(timerange.from / 1000);
  const { bucketSize } = calculateBucketSize(timerange);

  // negative offset to align buckets with full intervals (e.g. minutes)
  const offset = (fromInSeconds % bucketSize) - bucketSize;
  return `${offset}s`;
};
