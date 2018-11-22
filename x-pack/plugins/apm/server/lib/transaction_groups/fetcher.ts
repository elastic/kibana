/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggregationSearchResponse } from 'elasticsearch';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import {
  TRANSACTION_DURATION,
  TRANSACTION_NAME
} from '../../../common/constants';
import { Transaction } from '../../../typings/Transaction';
import { Setup } from '../helpers/setup_request';

interface Bucket {
  key: string;
  doc_count: number;
  avg: {
    value: number;
  };
  p95: {
    values: {
      '95.0': number;
    };
  };
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
  const params = {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: bodyQuery,
      aggs: {
        transactions: {
          terms: {
            field: `${TRANSACTION_NAME}.keyword`,
            order: { avg: 'desc' },
            size: 100
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' } }]
              }
            },
            avg: { avg: { field: TRANSACTION_DURATION } },
            p95: {
              percentiles: { field: TRANSACTION_DURATION, percents: [95] }
            }
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
