/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraTimerangeInput } from '../../../../../common/http_api';
import { calculateRateTimeranges } from './calculate_rate_timeranges';

export const createRateAggsWithInterface = (
  timerange: InfraTimerangeInput,
  id: string,
  field: string,
  interfaceField: string
) => {
  const { firstBucketRange, secondBucketRange, intervalInSeconds } =
    calculateRateTimeranges(timerange);

  const interfaceAggs = {
    interfaces: {
      terms: {
        field: interfaceField,
      },
      aggs: { maxValue: { max: { field } } },
    },
    sumOfInterfaces: {
      sum_bucket: {
        buckets_path: 'interfaces>maxValue',
      },
    },
  };

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
      aggs: interfaceAggs,
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
      aggs: interfaceAggs,
    },
    [id]: {
      bucket_script: {
        buckets_path: {
          first: `${id}_first_bucket.sumOfInterfaces`,
          second: `${id}_second_bucket.sumOfInterfaces`,
        },
        script: `params.second > 0.0 && params.first > 0.0 && params.second > params.first ? (params.second - params.first) / ${intervalInSeconds}: null`,
      },
    },
  };
};
