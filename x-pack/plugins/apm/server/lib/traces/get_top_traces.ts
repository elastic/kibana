/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { get } from 'lodash';
import {
  PARENT_ID,
  PROCESSOR_EVENT,
  TRACE_ID
} from '../../../common/constants';
import { Transaction } from '../../../typings/Transaction';
import { ITransactionGroup } from '../../../typings/TransactionGroup';
import { Setup } from '../helpers/setup_request';
import {
  ITransactionGroupBucket,
  prepareTransactionGroups,
  TRANSACTION_GROUP_AGGREGATES
} from '../helpers/transaction_group_query';

export async function getTopTraces(setup: Setup): Promise<ITransactionGroup[]> {
  const { start, end, esFilterQuery, client, config } = setup;

  const params = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          must: {
            // this criterion safeguards against data that lacks a transaction
            // parent ID but still is not a "trace" by way of not having a
            // trace ID (e.g. old data before parent ID was implemented, etc)
            exists: {
              field: TRACE_ID
            }
          },
          must_not: {
            // no parent ID alongside a trace ID means this transaction is a
            // "root" transaction, i.e. a trace
            exists: {
              field: PARENT_ID
            }
          },
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            },
            { term: { [PROCESSOR_EVENT]: 'transaction' } }
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
  const buckets: ITransactionGroupBucket[] = get(
    response.aggregations,
    'transactions.buckets',
    []
  );

  return prepareTransactionGroups({ buckets, start, end });
}
