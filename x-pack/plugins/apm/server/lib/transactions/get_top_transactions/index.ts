/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../typings/common';
import { rangeFilter } from '../../helpers/range_filter';
import { Setup } from '../../helpers/setup_request';
import { getTransactionGroups } from '../../transaction_groups';

export interface IOptions {
  setup: Setup;
  transactionType?: string;
  serviceName: string;
}

export type TransactionListAPIResponse = PromiseReturnType<
  typeof getTopTransactions
>;
export async function getTopTransactions({
  setup,
  transactionType,
  serviceName
}: IOptions) {
  const { start, end, uiFiltersES } = setup;

  const bodyQuery = {
    bool: {
      filter: [
        { term: { [SERVICE_NAME]: serviceName } },
        { term: { [PROCESSOR_EVENT]: 'transaction' } },
        { range: rangeFilter(start, end) },
        ...uiFiltersES
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
