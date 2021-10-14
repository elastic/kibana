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
import { rangeQuery } from '../../../../observability/server';
import { Setup } from '../helpers/setup_request';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import {
  calculateThroughputWithInterval,
  calculateThroughputWithRange,
} from '../helpers/calculate_throughput';

export async function getTransactionsPerMinute({
  setup,
  bucketSize,
  searchAggregatedTransactions,
  start,
  end,
  intervalString,
}: {
  setup: Setup;
  bucketSize: number;
  intervalString: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const { aggregations } = await apmEventClient.search(
    'observability_overview_get_transactions_per_minute',
    {
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
              ...rangeQuery(start, end),
              ...getDocumentTypeFilterForAggregatedTransactions(
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
    aggregations.transactionType.buckets.find(
      ({ key: transactionType }) =>
        transactionType === TRANSACTION_REQUEST ||
        transactionType === TRANSACTION_PAGE_LOAD
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
        y: calculateThroughputWithInterval({
          bucketSize,
          value: bucket.doc_count,
        }),
      })) || [],
  };
}
