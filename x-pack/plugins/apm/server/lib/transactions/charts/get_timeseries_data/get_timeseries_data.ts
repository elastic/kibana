/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { round, sortBy } from 'lodash';
import mean from 'lodash.mean';
import { oc } from 'ts-optchain';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE
} from '../../../../../common/constants';
import { getBucketSize } from '../../../helpers/get_bucket_size';
import { Setup } from '../../../helpers/setup_request';
import { getAvgResponseTimeAnomalies } from '../get_avg_response_time_anomalies/get_avg_response_time_anomalies';

interface ResponseTimeBucket {
  key: number;
  doc_count: number;
  avg: {
    value: number;
  };
  pct: {
    values: {
      '95.0': number;
      '99.0': number;
    };
  };
}

interface TransactionResultBucket {
  key: string;
  doc_count: number;
  timeseries: {
    buckets: Array<{
      key: number;
      doc_count: number;
    }>;
  };
}

interface Aggs {
  response_times: {
    buckets: ResponseTimeBucket[];
  };
  transaction_results: {
    buckets: TransactionResultBucket[];
  };
  overall_avg_duration: {
    value: number;
  };
}

type MaybeNumber = number | null;

interface Props {
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  setup: Setup;
}

export interface AvgAnomalyBuckets {
  anomalyScore: number | null;
  lower: number | null;
  upper: number | null;
}

export interface TimeSeriesAPIResponse {
  totalHits: number;
  dates: number[];
  responseTimes: {
    avg: MaybeNumber[];
    p95: MaybeNumber[];
    p99: MaybeNumber[];
    avgAnomalies?: {
      bucketSpanAsMillis: number;
      buckets: AvgAnomalyBuckets[];
    };
  };
  tpmBuckets: Array<{
    key: string;
    avg: number;
    values: number[];
  }>;
  overallAvgDuration?: number;
}

export async function getTimeseriesData({
  serviceName,
  transactionType,
  transactionName,
  setup
}: Props): Promise<TimeSeriesAPIResponse> {
  const { start, end, esFilterQuery, client, config } = setup;
  const { intervalString, bucketSize } = getBucketSize(start, end, 'auto');

  const params: any = {
    index: config.get('apm_oss.transactionIndices'),
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

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  if (transactionName) {
    params.body.query.bool.must = [
      { term: { [`${TRANSACTION_NAME}.keyword`]: transactionName } }
    ];
  }

  const resp = await client('search', params);
  const aggs: Aggs = resp.aggregations;

  const overallAvgDuration = oc(aggs).overall_avg_duration.value();

  const responseTimeBuckets = oc(aggs)
    .response_times.buckets([])
    .slice(1, -1);
  const dates = responseTimeBuckets.map(bucket => bucket.key);
  const { avg, p95, p99 } = getResponseTime(responseTimeBuckets);

  const transactionResultBuckets = oc(aggs).transaction_results.buckets([]);
  const tpmBuckets = getTpmBuckets(transactionResultBuckets, bucketSize);

  const avgAnomalies = await getAvgResponseTimeAnomalies({
    serviceName,
    transactionType,
    transactionName,
    setup
  });

  return {
    totalHits: resp.hits.total,
    dates,
    responseTimes: {
      avg,
      p95,
      p99,
      avgAnomalies
    },
    tpmBuckets,
    overallAvgDuration
  };
}

export function getTpmBuckets(
  transactionResultBuckets: TransactionResultBucket[],
  bucketSize: number
) {
  const buckets = transactionResultBuckets.map(({ key, timeseries }) => {
    const tpmValues = timeseries.buckets
      .slice(1, -1)
      .map(bucket => round(bucket.doc_count * (60 / bucketSize), 1));

    return {
      key,
      avg: mean(tpmValues),
      values: tpmValues
    };
  });

  return sortBy(
    buckets,
    bucket => bucket.key.replace(/^HTTP (\d)xx$/, '00$1') // ensure that HTTP 3xx are sorted at the top
  );
}

function getResponseTime(responseTimeBuckets: ResponseTimeBucket[]) {
  return responseTimeBuckets.reduce(
    (acc, bucket) => {
      const { '95.0': p95, '99.0': p99 } = bucket.pct.values;

      acc.avg.push(bucket.avg.value);
      acc.p95.push(p95 >= 0 ? p95 : null);
      acc.p99.push(p99 >= 0 ? p99 : null);
      return acc;
    },
    {
      avg: [] as MaybeNumber[],
      p95: [] as MaybeNumber[],
      p99: [] as MaybeNumber[]
    }
  );
}
