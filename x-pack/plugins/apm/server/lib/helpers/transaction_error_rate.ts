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
} from '../../../../../typings/elasticsearch/aggregations';

export const getOutcomeAggregation = () => ({
  terms: {
    field: EVENT_OUTCOME,
    include: [EventOutcome.failure, EventOutcome.success],
  },
});

type OutcomeAggregation = ReturnType<typeof getOutcomeAggregation>;

export function calculateTransactionErrorPercentage(
  outcomeResponse: AggregationResultOf<OutcomeAggregation, {}>
) {
  const outcomes = Object.fromEntries(
    outcomeResponse.buckets.map(({ key, doc_count: count }) => [key, count])
  );

  const failedTransactions = outcomes[EventOutcome.failure] ?? 0;
  const successfulTransactions = outcomes[EventOutcome.success] ?? 0;

  return failedTransactions / (successfulTransactions + failedTransactions);
}

export function getTransactionErrorRateTimeSeries(
  buckets: AggregationResultOf<
    {
      date_histogram: AggregationOptionsByType['date_histogram'];
      aggs: { outcomes: OutcomeAggregation };
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
