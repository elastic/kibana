/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import { oc } from 'ts-optchain';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../../common/constants';
import { Setup } from '../../helpers/setup_request';

export type TransactionAPIResponse = Transaction | undefined;

export async function getTransaction(
  transactionId: string,
  traceId: string | undefined,
  setup: Setup
): Promise<TransactionAPIResponse> {
  const { start, end, esFilterQuery, client, config } = setup;

  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { term: { [TRANSACTION_ID]: transactionId } },
    {
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
          format: 'epoch_millis'
        }
      }
    }
  ];

  if (esFilterQuery) {
    filter.push(esFilterQuery);
  }

  if (traceId) {
    filter.push({ term: { [TRACE_ID]: traceId } });
  }

  const params = {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      size: 1,
      query: {
        bool: {
          filter
        }
      }
    }
  };

  const resp = await client<Transaction>('search', params);
  return oc(resp).hits.hits[0]._source();
}
