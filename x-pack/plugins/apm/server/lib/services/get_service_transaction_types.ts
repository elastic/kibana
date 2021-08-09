/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../observability/server';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';

export async function getServiceTransactionTypes({
  setup,
  serviceName,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end, apmEventClient } = setup;

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...getDocumentTypeFilterForAggregatedTransactions(
              searchAggregatedTransactions
            ),
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
          ],
        },
      },
      aggs: {
        types: {
          terms: { field: TRANSACTION_TYPE, size: 100 },
        },
      },
    },
  };

  const { aggregations } = await apmEventClient.search(
    'get_service_transaction_types',
    params
  );
  const transactionTypes =
    aggregations?.types.buckets.map((bucket) => bucket.key as string) || [];
  return { transactionTypes };
}
