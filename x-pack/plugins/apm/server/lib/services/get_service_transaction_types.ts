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
} from '../helpers/aggregated_transactions/get_use_aggregated_transaction';

export async function getServiceTransactionTypes({
  setup,
  serviceName,
  useAggregatedTransactions,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  useAggregatedTransactions: boolean;
}) {
  const { start, end, client } = setup;

  const params = {
    apm: {
      types: [
        getProcessorEventForAggregatedTransactions(useAggregatedTransactions),
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...getDocumentTypeFilterForAggregatedTransactions(
              useAggregatedTransactions
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

  const { aggregations } = await client.search(params);
  const transactionTypes =
    aggregations?.types.buckets.map((bucket) => bucket.key as string) || [];
  return { transactionTypes };
}
