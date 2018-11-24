/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggregationSearchResponse } from 'elasticsearch';
import { TopHits } from 'x-pack/plugins/apm/typings/elasticsearch';
import { ESClient } from '../../../../helpers/setup_request';

export interface IOptions {
  serviceName: string;
  transactionType: string;
  intervalString: string;
  client: ESClient;
  start: number;
  end: number;
}

interface Bucket {
  key_as_string: string;
  key: number;
  doc_count: number;
  anomaly_score: {
    value: number | null;
  };
  lower: {
    value: number | null;
  };
  upper: {
    value: number | null;
  };
}

interface Aggs {
  ml_avg_response_times: {
    buckets: Bucket[];
  };
  top_hits: TopHits<{
    bucket_span: number;
  }>;
}

export type ESResponse = AggregationSearchResponse<void, Aggs> | null;

export async function anomalyAggsFetcher({
  serviceName,
  transactionType,
  intervalString,
  client,
  start,
  end
}: IOptions): Promise<ESResponse> {
  const params = {
    index: `.ml-anomalies-${serviceName}-${transactionType}-high_mean_response_time`.toLowerCase(),
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

  try {
    return await client<void, Aggs>('search', params);
  } catch (err) {
    const isHttpError = 'statusCode' in err;
    if (isHttpError) {
      return null;
    }
    throw err;
  }
}
