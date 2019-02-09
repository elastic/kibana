/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggregationSearchResponse, SearchParams } from 'elasticsearch';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import {
  TRANSACTION_DURATION,
  TRANSACTION_NAME
} from '../../../common/elasticsearch_fieldnames';
import { Transaction } from '../../../typings/es_schemas/Transaction';
import { Setup } from '../helpers/setup_request';

interface Bucket {
  key: string;
  doc_count: number;
  avg: { value: number };
  p95: { values: { '95.0': number } };
  sum: { value: number };
  sample: {
    hits: {
      total: number;
      max_score: number | null;
      hits: Array<{
        _source: Transaction;
      }>;
    };
  };
}

interface Aggs {
  transactions: {
    buckets: Bucket[];
  };
}

export type ESResponse = AggregationSearchResponse<void, Aggs>;

export function transactionGroupsFetcher(
  setup: Setup,
  bodyQuery: StringMap
): Promise<ESResponse> {
  const { esFilterQuery, client, config } = setup;
  const params: SearchParams = {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: bodyQuery,
      aggs: {
        transactions: {
          terms: {
            field: TRANSACTION_NAME,
            order: { sum: 'desc' },
            size: config.get<number>('xpack.apm.ui.transactionGroupBucketSize')
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
                sort: [
                  { _score: 'desc' }, // sort by _score to ensure that buckets with sampled:true ends up on top
                  { '@timestamp': { order: 'desc' } }
                ]
              }
            },
            avg: { avg: { field: TRANSACTION_DURATION } },
            p95: {
              percentiles: { field: TRANSACTION_DURATION, percents: [95] }
            },
            sum: { sum: { field: TRANSACTION_DURATION } }
          }
        }
      }
    }
  };

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  return client<void, Aggs>('search', params);
}
