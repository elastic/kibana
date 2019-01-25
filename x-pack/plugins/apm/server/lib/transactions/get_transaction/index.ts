/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import {
  TransactionAPIResponse,
  TransactionWithErrorCount
} from 'x-pack/plugins/apm/typings/get_transaction';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../../common/constants';
import { getErrorCount } from '../../errors/get_error_count';
import { Setup } from '../../helpers/setup_request';

export async function getTransaction(
  transactionId: string,
  traceId: string,
  setup: Setup
): Promise<TransactionAPIResponse> {
  const { start, end, esFilterQuery, client, config } = setup;

  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { term: { [TRANSACTION_ID]: transactionId } },
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
  ];

  if (esFilterQuery) {
    filter.push(esFilterQuery);
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
  return idx(resp, _ => _.hits.hits[0]._source);
}

export async function getTransactionWithErrorCount(
  transactionId: string,
  traceId: string,
  setup: Setup
): Promise<TransactionWithErrorCount> {
  const transaction = await getTransaction(transactionId, traceId, setup);

  if (transaction) {
    return {
      transaction,
      errorCount: await getErrorCount({
        serviceName: transaction.service.name,
        transactionId: transaction.transaction.id,
        setup
      })
    };
  }

  return {
    transaction: undefined,
    errorCount: 0
  };
}
