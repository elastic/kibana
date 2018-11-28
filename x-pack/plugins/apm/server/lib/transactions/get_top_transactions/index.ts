/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from 'x-pack/plugins/apm/common/constants';
import { Setup } from 'x-pack/plugins/apm/server/lib/helpers/setup_request';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { getTransactionGroups } from '../../transaction_groups';
import { ITransactionGroup } from '../../transaction_groups/transform';

export interface IOptions {
  setup: Setup;
  transactionType?: string;
  serviceName: string;
}

export type TransactionListAPIResponse = ITransactionGroup[];

interface ESFilter {
  [key: string]: {
    [key: string]: string | number | StringMap;
  };
}

interface Query {
  bool: {
    filter: ESFilter[];
  };
}

export async function getTopTransactions({
  setup,
  transactionType,
  serviceName
}: IOptions) {
  const { start, end } = setup;

  // TODO: Find an ES type for this instead
  const bodyQuery: Query = {
    bool: {
      filter: [
        { term: { [SERVICE_NAME]: serviceName } },
        { term: { [PROCESSOR_EVENT]: 'transaction' } },
        {
          range: {
            '@timestamp': { gte: start, lte: end, format: 'epoch_millis' }
          }
        }
      ]
    }
  };

  if (transactionType) {
    bodyQuery.bool.filter.push({
      term: { [TRANSACTION_TYPE]: transactionType }
    });
  }

  return getTransactionGroups(setup, bodyQuery);
}
