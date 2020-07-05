/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../server/lib/helpers/setup_request';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
} from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../common/utils/range_filter';
import {
  getProcessorEventForAggregatedTransactions,
  getDocumentTypeFilterForAggregatedTransactions,
} from '../lib/helpers/aggregated_transactions/get_use_aggregated_transaction';

export function getTransactionsProjection({
  setup,
  serviceName,
  transactionName,
  transactionType,
  useAggregatedTransactions,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  useAggregatedTransactions: boolean;
}) {
  const { start, end, uiFiltersES } = setup;

  const transactionNameFilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];
  const transactionTypeFilter = transactionType
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];
  const serviceNameFilter = serviceName
    ? [{ term: { [SERVICE_NAME]: serviceName } }]
    : [];

  const bool = {
    filter: [
      { range: rangeFilter(start, end) },
      ...transactionNameFilter,
      ...transactionTypeFilter,
      ...serviceNameFilter,
      ...uiFiltersES,
      ...getDocumentTypeFilterForAggregatedTransactions(
        useAggregatedTransactions
      ),
    ],
  };

  return {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(useAggregatedTransactions),
      ],
    },
    body: {
      query: {
        bool,
      },
    },
  };
}
