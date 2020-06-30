/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBucketSize } from './get_bucket_size';

export function getMetricsDateHistogramParams(start: number, end: number) {
  const { bucketSize } = getBucketSize(start, end, 'auto');
  return {
    field: '@timestamp',

    // ensure minimum bucket size of 30s since this is the default resolution for metric data
    fixed_interval: `${Math.max(bucketSize, 30)}s`,

    min_doc_count: 0,
    extended_bounds: { min: start, max: end },
  };
}
