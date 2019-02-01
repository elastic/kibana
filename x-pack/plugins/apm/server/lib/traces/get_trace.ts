/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import { Span } from '../../../typings/es_schemas/Span';
import { Transaction } from '../../../typings/es_schemas/Transaction';
import { Setup } from '../helpers/setup_request';

export interface TransactionErrorCounts {
  [transactionId: string]: number;
}
export type TraceItems = Array<Transaction | Span>;
export interface TraceAPIResponse {
  trace: TraceItems;
  transactionErrorCounts: TransactionErrorCounts;
}

interface TraceErrorsAggregationBucket {
  key: string;
  errors: {
    doc_count: number;
  };
}

interface TraceAggregationResponse {
  transactions: {
    buckets: TraceErrorsAggregationBucket[];
  };
}

export async function getTrace(
  traceId: string,
  setup: Setup
): Promise<TraceAPIResponse> {
  const { start, end, client, config } = setup;

  const params: SearchParams = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 1000,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
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
        transactions: {
          terms: {
            field: 'transaction.id'
          },
          aggs: {
            errors: {
              filter: {
                term: {
                  'processor.event': 'error'
                }
              }
            }
          }
        }
      }
    }
  };

  const resp = await client<Span | Transaction, TraceAggregationResponse>(
    'search',
    params
  );
  const trace = resp.hits.hits.map(hit => hit._source);
  const transactionErrorCounts = resp.aggregations.transactions.buckets.reduce(
    (
      acc: object,
      { key, errors: { doc_count } }: TraceErrorsAggregationBucket
    ) => {
      return {
        ...acc,
        [key]: doc_count
      };
    },
    {}
  );

  return {
    trace,
    transactionErrorCounts
  };
}
