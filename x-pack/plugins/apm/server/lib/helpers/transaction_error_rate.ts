/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationOptionsByType,
  AggregationResultOf,
} from '@kbn/core/types/elasticsearch';
import { EVENT_OUTCOME } from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';

export const getOutcomeAggregation = () => ({
  terms: {
    field: EVENT_OUTCOME,
    include: [EventOutcome.failure, EventOutcome.success],
  },
});

type OutcomeAggregation = ReturnType<typeof getOutcomeAggregation>;

export const getTimeseriesAggregation = (
  start: number,
  end: number,
  intervalString: string
) => ({
  date_histogram: {
    field: '@timestamp',
    fixed_interval: intervalString,
    min_doc_count: 0,
    extended_bounds: { min: start, max: end },
  },
  aggs: { outcomes: getOutcomeAggregation() },
});

export function calculateFailedTransactionRate(
  outcomeResponse: AggregationResultOf<OutcomeAggregation, {}>
) {
  const outcomes = Object.fromEntries(
    outcomeResponse.buckets.map(({ key, doc_count: count }) => [key, count])
  );

  const failedTransactions = outcomes[EventOutcome.failure] ?? 0;
  const successfulTransactions = outcomes[EventOutcome.success] ?? 0;

  return failedTransactions / (successfulTransactions + failedTransactions);
}

export function getFailedTransactionRateTimeSeries(
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
      y: calculateFailedTransactionRate(dateBucket.outcomes),
    };
  });
}
