/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getBucketSize } from '../../helpers/get_bucket_size';

export async function getAvgResponseTimeAnomalies({
  serviceName,
  transactionType,
  setup
}) {
  const { start, end, client } = setup;
  const { intervalString, bucketSize } = getBucketSize(start, end, 'auto');

  const params = {
    index: `.ml-anomalies-${serviceName}-${transactionType}-high_mean_response_time`,
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
        top_hits: {
          top_hits: {
            sort: ['bucket_span'],
            _source: { includes: ['bucket_span'] },
            size: 1
          }
        },
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
            anomaly_score: { max: { field: 'anomaly_score' } },
            lower: { min: { field: 'model_lower' } },
            upper: { max: { field: 'model_upper' } }
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
      return {
        message: 'ml index does not exist'
      };
    }
    throw e;
  }

  const buckets = get(resp, 'aggregations.ml_avg_response_times.buckets', [])
    .slice(1, -1)
    .map(bucket => {
      return {
        anomaly_score: bucket.anomaly_score.value,
        lower: bucket.lower.value,
        upper: bucket.upper.value
      };
    });

  const anomalyBucketSpan = get(
    resp,
    'aggregations.top_hits.hits.hits[0]._source.bucket_span'
  );

  return {
    bucketSpanInSeconds: Math.max(bucketSize, anomalyBucketSpan),
    buckets
  };
}
