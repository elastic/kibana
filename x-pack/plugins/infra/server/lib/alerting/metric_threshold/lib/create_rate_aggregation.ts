/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateRateTimeranges } from '../../inventory_metric_threshold/lib/calculate_rate_timeranges';

export const createRateAggs = (
  timeframe: { start: number; end: number },
  id: string,
  field: string
) => {
  const { firstBucketRange, secondBucketRange, intervalInSeconds } = calculateRateTimeranges({
    to: timeframe.end,
    from: timeframe.start,
  });

  return {
    [`${id}_first_bucket`]: {
      filter: {
        range: {
          '@timestamp': {
            gte: firstBucketRange.from,
            lt: firstBucketRange.to,
            format: 'epoch_millis',
          },
        },
      },
      aggs: { maxValue: { max: { field } } },
    },
    [`${id}_second_bucket`]: {
      filter: {
        range: {
          '@timestamp': {
            gte: secondBucketRange.from,
            lt: secondBucketRange.to,
            format: 'epoch_millis',
          },
        },
      },
      aggs: { maxValue: { max: { field } } },
    },
    [id]: {
      bucket_script: {
        buckets_path: {
          first: `${id}_first_bucket.maxValue`,
          second: `${id}_second_bucket.maxValue`,
        },
        script: `params.second > 0.0 && params.first > 0.0 && params.second > params.first ? (params.second - params.first) / ${intervalInSeconds}: null`,
      },
    },
  };
};
