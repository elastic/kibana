/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_DURATION,
  TRANSACTION_RESULT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME
} from '../../../../common/constants';
import { get, sortBy, round } from 'lodash';
import mean from 'lodash.mean';
import { getBucketSize } from '../../helpers/get_bucket_size';

export async function getTimeseriesData({
  serviceName,
  transactionType,
  transactionName,
  setup
}) {
  const { start, end, client, config } = setup;
  const { intervalString, bucketSize } = getBucketSize(start, end, 'auto');

  const params = {
    index: config.get('xpack.apm.indexPattern'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            {
              range: {
                '@timestamp': {
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
        response_times: {
          date_histogram: {
            field: '@timestamp',
            interval: intervalString,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end
            }
          },
          aggs: {
            avg: {
              avg: { field: TRANSACTION_DURATION }
            },
            pct: {
              percentiles: {
                field: TRANSACTION_DURATION,
                percents: [95, 99]
              }
            }
          }
        },
        overall_avg_duration: {
          avg: { field: TRANSACTION_DURATION }
        },
        transaction_results: {
          terms: {
            field: TRANSACTION_RESULT,
            missing: 'transaction_result_missing'
          },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                interval: intervalString,
                min_doc_count: 0,
                extended_bounds: {
                  min: start,
                  max: end
                }
              }
            }
          }
        }
      }
    }
  };

  if (transactionName) {
    params.body.query.bool.must = [
      { term: { [`${TRANSACTION_NAME}.keyword`]: transactionName } }
    ];
  }

  const resp = await client('search', params);
  const responseTimeBuckets = get(
    resp,
    'aggregations.response_times.buckets',
    []
  ).slice(1, -1);

  const transactionResultBuckets = get(
    resp,
    'aggregations.transaction_results.buckets',
    []
  );

  const overallAvgDuration = get(
    resp,
    'aggregations.overall_avg_duration.value'
  );
  const dates = responseTimeBuckets.map(bucket => bucket.key);

  const responseTime = responseTimeBuckets.reduce(
    (acc, bucket) => {
      const { '95.0': p95, '99.0': p99 } = bucket.pct.values;

      acc.avg.push(bucket.avg.value);
      acc.p95.push(p95 >= 0 ? p95 : null);
      acc.p99.push(p99 >= 0 ? p99 : null);
      return acc;
    },
    { avg: [], p95: [], p99: [] }
  );

  const tpmBuckets = sortBy(
    transactionResultBuckets.map(({ key, timeseries }) => {
      const tpmValues = timeseries.buckets
        .slice(1, -1)
        .map(bucket => round(bucket.doc_count * (60 / bucketSize), 1));

      return {
        key,
        avg: mean(tpmValues),
        values: tpmValues
      };
    }),
    bucket => bucket.key.replace(/^HTTP (\d)xx$/, '00$1') // ensure that HTTP 3xx are sorted at the top
  );

  return {
    total_hits: resp.hits.total,
    dates: dates,
    response_times: {
      avg: responseTime.avg,
      p95: responseTime.p95,
      p99: responseTime.p99
    },
    tpm_buckets: tpmBuckets,
    weighted_average: overallAvgDuration || 0
  };
}
