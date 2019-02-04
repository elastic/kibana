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

export interface TraceAPIResponse {
  trace: Array<Transaction | Span>;
  errorsPerTransaction: {
    [transactionId: string]: number;
  };
}

interface TraceErrorsAggBucket {
  key: string;
  errors: {
    doc_count: number;
  };
}

interface TraceErrorsAggResponse {
  transactions: {
    buckets: TraceErrorsAggBucket[];
  };
}

export async function getTrace(
  traceId: string,
  setup: Setup
): Promise<TraceAPIResponse> {
  const { start, end, client, config } = setup;

  const query = {
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
  };

  const traceParams: SearchParams = {
    index: [
      config.get('apm_oss.spanIndices'),
      config.get('apm_oss.transactionIndices')
    ],
    body: {
      size: 1000,
      query
    }
  };

  const errorsAggParams: SearchParams = {
    index: [config.get('apm_oss.errorIndices')],
    body: {
      size: 0,
      query,
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

  return Promise.all([
    client<Span | Transaction>('search', traceParams), // query for trace items (spans & transaction)
    client<Span | Transaction, TraceErrorsAggResponse>( // agg for transaction error count
      'search',
      errorsAggParams
    )
  ]).then(([traceResponse, errorsAggResponse]) => {
    const trace = traceResponse.hits.hits.map(hit => hit._source);
    const errorsPerTransaction = errorsAggResponse.aggregations.transactions.buckets.reduce(
      (accumulatedErrorsPerTransaction, bucket: TraceErrorsAggBucket) => {
        const {
          key,
          errors: { doc_count }
        } = bucket;
        return {
          ...accumulatedErrorsPerTransaction,
          [key]: doc_count
        };
      },
      {}
    );

    return {
      trace,
      errorsPerTransaction
    };
  });
}
