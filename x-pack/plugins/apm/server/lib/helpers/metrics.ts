/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBucketSize } from './get_bucket_size';

export function getMetricsDateHistogramParams(
  start: number,
  end: number,
  metricsInterval: number
) {
  const { bucketSize } = getBucketSize(start, end);
  return {
    field: '@timestamp',

    // ensure minimum bucket size of configured interval since this is the default resolution for metric data
    fixed_interval: `${Math.max(bucketSize, metricsInterval)}s`,

    min_doc_count: 0,
    extended_bounds: { min: start, max: end },
  };
}
