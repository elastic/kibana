/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../../server/lib/helpers/setup_request';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
} from '../../common/elasticsearch_fieldnames';
import { environmentQuery, rangeQuery } from '../../common/utils/queries';
import {
  getProcessorEventForAggregatedTransactions,
  getDocumentTypeFilterForAggregatedTransactions,
} from '../lib/helpers/aggregated_transactions';

export function getTransactionsProjection({
  environment,
  setup,
  serviceName,
  transactionName,
  transactionType,
  searchAggregatedTransactions,
}: {
  environment?: string;
  setup: Setup & SetupTimeRange;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end, esFilter } = setup;

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
      ...serviceNameFilter,
      ...transactionNameFilter,
      ...transactionTypeFilter,
      ...getDocumentTypeFilterForAggregatedTransactions(
        searchAggregatedTransactions
      ),
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
      ...esFilter,
    ],
  };

  return {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: {
      query: {
        bool,
      },
    },
  };
}
