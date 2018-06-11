/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getBucketSize } from '../../helpers/get_bucket_size';

export async function getMlAvgResponseTimes({ serviceName, setup }) {
  const { start, end, client } = setup;
  const { intervalString } = getBucketSize(start, end, 'auto');

  const params = {
    index: `.ml-anomalies-${serviceName}-high_mean_response_time`,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                timestamp: {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      },
      aggs: {
        ml_avg_response_times: {
          date_histogram: {
            field: 'timestamp',
            interval: intervalString,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end
            }
          },
          aggs: {
            lower: {
              avg: {
                field: 'model_lower'
              }
            },
            upper: {
              avg: {
                field: 'model_upper'
              }
            },
            actual: {
              avg: {
                field: 'actual'
              }
            }
          }
        }
      }
    }
  };

  let resp;
  try {
    resp = await client('search', params);
  } catch (e) {
    if (e.statusCode === 404) {
      return [];
    }
    throw e;
  }

  return get(resp, 'aggregations.ml_avg_response_times.buckets', [])
    .slice(1, -1)
    .map(bucket => {
      return {
        actual: bucket.actual.value,
        lower: bucket.lower.value,
        upper: bucket.upper.value
      };
    });
}
