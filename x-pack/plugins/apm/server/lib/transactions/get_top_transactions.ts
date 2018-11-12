/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams, SearchResponse } from 'elasticsearch';
import { get } from 'lodash';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/constants';
import { Transaction } from '../../../typings/Transaction';
import { ITransactionGroup } from '../../../typings/TransactionGroup';
import { Setup } from '../helpers/setup_request';
import {
  prepareTransactionGroups,
  TRANSACTION_GROUP_AGGREGATES
} from '../helpers/transaction_group_query';

export async function getTopTransactions({
  setup,
  transactionType,
  serviceName
}: {
  setup: Setup;
  transactionType: string;
  serviceName: string;
}): Promise<ITransactionGroup[]> {
  const { start, end, esFilterQuery, client, config } = setup;

  const params: SearchParams = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            { term: { [PROCESSOR_EVENT]: 'transaction' } },
            {
              range: {
                '@timestamp': { gte: start, lte: end, format: 'epoch_millis' }
              }
            }
          ]
        }
      },
      aggs: TRANSACTION_GROUP_AGGREGATES
    }
  };

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  const response: SearchResponse<Transaction> = await client('search', params);
  const buckets = get(response, 'aggregations.transactions.buckets', []);

  return prepareTransactionGroups({ buckets, start, end });
}
