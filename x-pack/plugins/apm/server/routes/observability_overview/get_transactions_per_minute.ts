/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { isDefaultTransactionType } from '../../../common/transaction_types';
import { TRANSACTION_TYPE } from '../../../common/es_fields/apm';
import {
  getBackwardCompatibleDocumentTypeFilter,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTransactionsPerMinute({
  apmEventClient,
  bucketSize,
  searchAggregatedTransactions,
  start,
  end,
  intervalString,
}: {
  apmEventClient: APMEventClient;
  bucketSize: number;
  intervalString: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}) {
  const { aggregations } = await apmEventClient.search(
    'observability_overview_get_transactions_per_minute',
    {
      apm: {
        events: [
          getProcessorEventForTransactions(searchAggregatedTransactions),
        ],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...getBackwardCompatibleDocumentTypeFilter(
                searchAggregatedTransactions
              ),
            ],
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
                  fixed_interval: intervalString,
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
    }
  );

  if (!aggregations || !aggregations.transactionType.buckets) {
    return { value: undefined, timeseries: [] };
  }

  const topTransactionTypeBucket =
    aggregations.transactionType.buckets.find(({ key: transactionType }) =>
      isDefaultTransactionType(transactionType as string)
    ) || aggregations.transactionType.buckets[0];

  return {
    value: calculateThroughputWithRange({
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
