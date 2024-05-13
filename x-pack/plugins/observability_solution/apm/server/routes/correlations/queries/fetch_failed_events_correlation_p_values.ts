/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { termQuery } from '@kbn/observability-plugin/server';
import { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
import { EVENT_OUTCOME, PROCESSOR_EVENT } from '../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../common/event_outcome';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';
import { fetchDurationRanges } from './fetch_duration_ranges';
import { getEventType } from '../utils';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export const fetchFailedEventsCorrelationPValues = async ({
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  query,
  rangeSteps,
  fieldName,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  rangeSteps: number[];
  fieldName: string;
}) => {
  const chartType = LatencyDistributionChartType.failedTransactionsCorrelations;
  const searchMetrics = false; // failed transactions correlations does not search metrics documents
  const eventType = getEventType(chartType, searchMetrics);

  const commonQuery = getCommonCorrelationsQuery({
    start,
    end,
    environment,
    kuery,
    query,
  });

  const resp = await apmEventClient.search('get_failed_events_correlation_p_values', {
    apm: {
      events: [eventType],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [commonQuery, ...termQuery(EVENT_OUTCOME, EventOutcome.failure)],
        },
      },
      aggs: {
        failure_p_value: {
          significant_terms: {
            field: fieldName,
            background_filter: {
              // Important to have same query as above here
              // without it, we would be comparing sets of different filtered elements
              bool: {
                filter: [commonQuery, ...termQuery(PROCESSOR_EVENT, eventType)],
              },
            },
            // No need to have must_not "event.outcome": "failure" clause
            // if background_is_superset is set to true
            p_value: { background_is_superset: true },
          },
        },
      },
    },
  });

  const { aggregations } = resp;

  if (!aggregations) {
    return [];
  }

  const overallResult = aggregations.failure_p_value;

  // Using for of to sequentially augment the results with histogram data.
  const result: FailedTransactionsCorrelation[] = [];
  for (const bucket of overallResult.buckets) {
    // Scale the score into a value from 0 - 1
    // using a concave piecewise linear function in -log(p-value)
    const normalizedScore =
      0.5 * Math.min(Math.max((bucket.score - 3.912) / 2.995, 0), 1) +
      0.25 * Math.min(Math.max((bucket.score - 6.908) / 6.908, 0), 1) +
      0.25 * Math.min(Math.max((bucket.score - 13.816) / 101.314, 0), 1);

    const { durationRanges: histogram } = await fetchDurationRanges({
      apmEventClient,
      chartType,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [query, ...termQuery(fieldName, bucket.key)],
        },
      },
      rangeSteps,
      searchMetrics,
    });

    result.push({
      fieldName,
      fieldValue: bucket.key,
      doc_count: bucket.doc_count,
      bg_count: bucket.doc_count,
      score: bucket.score,
      pValue: Math.exp(-bucket.score),
      normalizedScore,
      // Percentage of time the term appears in failed transactions
      failurePercentage: bucket.doc_count / overallResult.doc_count,
      // Percentage of time the term appears in successful transactions
      successPercentage:
        (bucket.bg_count - bucket.doc_count) / (overallResult.bg_count - overallResult.doc_count),
      histogram,
    });
  }

  return result;
};
