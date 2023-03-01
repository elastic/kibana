/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBucketSize } from '../../../common/utils/get_bucket_size';

export function getMetricsDateHistogramParams(
  options: {
    start: number;
    end: number;
    timestampOverride?: string;
  } & ({ metricsInterval: number } | { bucketSizeInSeconds: number })
) {
  const { start, end, timestampOverride = '@timestamp' } = options;

  const fixedInterval =
    'bucketSizeInSeconds' in options
      ? options.bucketSizeInSeconds
      : Math.max(
          getBucketSize({ start, end }).bucketSize,
          options.metricsInterval
        );

  return {
    field: timestampOverride,

    // ensure minimum bucket size of configured interval since this is the default resolution for metric data
    fixed_interval: `${fixedInterval}s`,

    min_doc_count: 0,
    extended_bounds: { min: start, max: end },
  };
}
