/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { calculateRateTimeranges } from '../utils';
export const createRateAggsBucketScript = (
  timeframe: { start: number; end: number },
  id: string
) => {
  const { intervalInSeconds } = calculateRateTimeranges({
    to: timeframe.end,
    from: timeframe.start,
  });
  return {
    [id]: {
      bucket_script: {
        buckets_path: {
          first: `${id}_first_bucket.maxValue`,
          second: `${id}_second_bucket.maxValue`,
        },
        script: `params.second > 0.0 && params.first > 0.0 && params.second > params.first ? (params.second - params.first) / ${intervalInSeconds}: 0`,
      },
    },
  };
};

export const createRateAggsBuckets = (
  timeframe: { start: number; end: number },
  id: string,
  timeFieldName: string,
  field: string
) => {
  const { firstBucketRange, secondBucketRange } = calculateRateTimeranges({
    to: timeframe.end,
    from: timeframe.start,
  });

  return {
    [`${id}_first_bucket`]: {
      filter: {
        range: {
          [timeFieldName]: {
            gte: moment(firstBucketRange.from).toISOString(),
            lt: moment(firstBucketRange.to).toISOString(),
          },
        },
      },
      aggs: { maxValue: { max: { field } } },
    },
    [`${id}_second_bucket`]: {
      filter: {
        range: {
          [timeFieldName]: {
            gte: moment(secondBucketRange.from).toISOString(),
            lt: moment(secondBucketRange.to).toISOString(),
          },
        },
      },
      aggs: { maxValue: { max: { field } } },
    },
  };
};
