/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationResultOf } from '../../../typings/elasticsearch/aggregations';
import { EventOutcome } from '../../../common/event_outcome';
import {
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  SERVICE_NAME,
  EVENT_OUTCOME,
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../common/utils/range_filter';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getBucketSize } from '../helpers/get_bucket_size';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';

export async function getErrorRate({
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end, esFilter, apmEventClient } = setup;

  const transactionNamefilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];
  const transactionTypefilter = transactionType
    ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
    : [];

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    {
      terms: { [EVENT_OUTCOME]: [EventOutcome.failure, EventOutcome.success] },
    },
    ...transactionNamefilter,
    ...transactionTypefilter,
    ...esFilter,
  ];

  const outcomes = {
    terms: {
      field: EVENT_OUTCOME,
    },
    aggs: {
      count: {
        value_count: {
          field: getTransactionDurationFieldForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        },
      },
    },
  };

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
      query: { bool: { filter } },
      aggs: {
        outcomes,
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: getBucketSize(start, end).intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            outcomes,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(params);

  const noHits = resp.hits.total.value === 0;

  if (!resp.aggregations) {
    return { noHits, erroneousTransactionsRate: [], average: null };
  }

  function calculateTransactionErrorPercentage(
    outcomeResponse: AggregationResultOf<typeof outcomes, {}>
  ) {
    const successfulTransactions =
      outcomeResponse.buckets.find(
        (bucket) => bucket.key === EventOutcome.success
      )?.count.value ?? 0;
    const failedTransactions =
      outcomeResponse.buckets.find(
        (bucket) => bucket.key === EventOutcome.failure
      )?.count.value ?? 0;

    return failedTransactions / (successfulTransactions + failedTransactions);
  }

  const erroneousTransactionsRate = resp.aggregations.timeseries.buckets.map(
    (bucket) => {
      return {
        x: bucket.key,
        y: calculateTransactionErrorPercentage(bucket.outcomes),
      };
    }
  );

  const average = calculateTransactionErrorPercentage(
    resp.aggregations.outcomes
  );

  return { noHits, erroneousTransactionsRate, average };
}
