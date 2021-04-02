/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import { TRANSACTION_TYPE } from '../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../server/utils/queries';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { calculateThroughput } from '../helpers/calculate_throughput';
import { withApmSpan } from '../../utils/with_apm_span';

export function getTransactionsPerMinute({
  setup,
  bucketSize,
  searchAggregatedTransactions,
}: {
  setup: Setup & SetupTimeRange;
  bucketSize: string;
  searchAggregatedTransactions: boolean;
}) {
  return withApmSpan(
    'observability_overview_get_transactions_per_minute',
    async () => {
      const { apmEventClient, start, end } = setup;

      const { aggregations } = await apmEventClient.search({
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
              filter: rangeQuery(start, end),
            },
          },
          aggs: {
            transactionType: {
              terms: {
                field: TRANSACTION_TYPE,
              },
              aggs: {
                timeseries: {
                  date_histogram: {
                    field: '@timestamp',
                    fixed_interval: bucketSize,
                    min_doc_count: 0,
                  },
                  aggs: {
                    throughput: { rate: { unit: 'minute' as const } },
                  },
                },
              },
            },
          },
        },
      });

      if (!aggregations || !aggregations.transactionType.buckets) {
        return { value: undefined, timeseries: [] };
      }

      const topTransactionTypeBucket =
        aggregations.transactionType.buckets.find(
          ({ key: transactionType }) =>
            transactionType === TRANSACTION_REQUEST ||
            transactionType === TRANSACTION_PAGE_LOAD
        ) || aggregations.transactionType.buckets[0];

      return {
        value: calculateThroughput({
          start,
          end,
          value: topTransactionTypeBucket?.doc_count || 0,
        }),
        timeseries:
          topTransactionTypeBucket?.timeseries.buckets.map((bucket) => ({
            x: bucket.key,
            y: bucket.throughput.value,
          })) || [],
      };
    }
  );
}
