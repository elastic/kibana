/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDateBucketOptions } from '../../../common/utils/get_date_bucket_options';

export function getMetricsDateHistogramParams(
  start: number,
  end: number,
  metricsInterval: number
) {
  const { bucketSizeInSeconds } = getDateBucketOptions(start, end);
  return {
    field: '@timestamp',

    // ensure minimum bucket size of configured interval since this is the default resolution for metric data
    fixed_interval: `${Math.max(bucketSizeInSeconds, metricsInterval)}s`,

    min_doc_count: 0,
    extended_bounds: { min: start, max: end },
  };
}
