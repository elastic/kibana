/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../common/utils/range_filter';
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
            { range: rangeFilter(start, end) },
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

  const { aggregations } = await apmEventClient.search(params);
  const transactionTypes =
    aggregations?.types.buckets.map((bucket) => bucket.key as string) || [];
  return { transactionTypes };
}
