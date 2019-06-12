/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';

export interface ErrorsPerTransaction {
  [transactionId: string]: number;
}

interface TraceErrorsAggBucket {
  key: string;
  doc_count: number;
}

interface TraceErrorsAggResponse {
  transactions: {
    buckets: TraceErrorsAggBucket[];
  };
}

export async function getTraceErrorsPerTransaction(
  traceId: string,
  setup: Setup
): Promise<ErrorsPerTransaction> {
  const { start, end, client, config } = setup;

  const params: SearchParams = {
    index: [config.get('apm_oss.errorIndices')],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { range: rangeFilter(start, end) }
          ]
        }
      },
      aggs: {
        transactions: {
          terms: {
            field: TRANSACTION_ID
          }
        }
      }
    }
  };

  const resp = await client.search<never, TraceErrorsAggResponse>(params);

  return resp.aggregations.transactions.buckets.reduce(
    (acc, bucket) => ({
      ...acc,
      [bucket.key]: bucket.doc_count
    }),
    {}
  );
}
