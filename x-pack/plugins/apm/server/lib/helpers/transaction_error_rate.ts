/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EVENT_OUTCOME } from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import {
  AggregationOptionsByType,
  AggregationResultOf,
} from '../../../typings/elasticsearch/aggregations';
import { getTransactionDurationFieldForAggregatedTransactions } from './aggregated_transactions';

export function getOutcomeAggregation({
  searchAggregatedTransactions,
}: {
  searchAggregatedTransactions: boolean;
}) {
  return {
    terms: { field: EVENT_OUTCOME },
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
}

export function calculateTransactionErrorPercentage(
  outcomeResponse: AggregationResultOf<
    ReturnType<typeof getOutcomeAggregation>,
    {}
  >
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

export function getTransactionErrorRateTimeSeries(
  buckets: AggregationResultOf<
    {
      date_histogram: AggregationOptionsByType['date_histogram'];
      aggs: { outcomes: ReturnType<typeof getOutcomeAggregation> };
    },
    {}
  >['buckets']
) {
  return buckets.map((dateBucket) => {
    return {
      x: dateBucket.key,
      y: calculateTransactionErrorPercentage(dateBucket.outcomes),
    };
  });
}
