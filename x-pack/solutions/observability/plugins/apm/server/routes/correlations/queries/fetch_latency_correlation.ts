/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { EVENT_OUTCOME } from '../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../common/event_outcome';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import { CorrelationType } from '../../../../common/correlations/types';
import type {
  UnifiedCorrelationsResponse,
  UnifiedCorrelation,
  CommonCorrelationsQueryParams,
  FieldValuePair,
} from '../../../../common/correlations/types';
import { getPrioritizedFieldValuePairs } from '../../../../common/correlations/utils';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../common/correlations/constants';
import { getOverallLatencyDistribution } from '../../latency_distribution/get_overall_latency_distribution';
import { fetchDurationFieldCandidates } from './fetch_duration_field_candidates';
import { fetchFieldValuePairs } from './fetch_field_value_pairs';
import { fetchSignificantCorrelations } from './fetch_significant_correlations';
import { fetchPValues } from './fetch_p_values';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

const CHUNK_SIZE = 10;

interface FetchLatencyCorrelationsParams extends CommonCorrelationsQueryParams {
  apmEventClient: APMEventClient;
  correlationType: CorrelationType;
  fieldCandidates?: string[];
  percentileThreshold?: number;
  durationMin?: number;
  durationMax?: number;
  config?: {
    apm: {
      searchAggregatedTransactions?: boolean;
    };
  };
}

export async function fetchLatencyCorrelations({
  apmEventClient,
  correlationType,
  fieldCandidates: providedFieldCandidates,
  start,
  end,
  environment,
  kuery,
  query,
  percentileThreshold = DEFAULT_PERCENTILE_THRESHOLD,
  durationMin: providedDurationMin,
  durationMax: providedDurationMax,
  config,
}: FetchLatencyCorrelationsParams): Promise<UnifiedCorrelationsResponse> {
  const chartType =
    correlationType === CorrelationType.ERROR_RATE
      ? LatencyDistributionChartType.failedTransactionsCorrelations
      : LatencyDistributionChartType.latencyCorrelations;

  // Determine if we should search metrics (only for transaction latency distribution)
  // Note: chartType is either latencyCorrelations or failedTransactionsCorrelations,
  // so we don't search aggregated transactions for correlations
  const searchAggregatedTransactions = false;

  // Step 1: Get overall distribution
  const overallDistribution = await getOverallLatencyDistribution({
    chartType,
    apmEventClient,
    start,
    end,
    environment,
    kuery,
    query,
    percentileThreshold,
    durationMinOverride: providedDurationMin,
    durationMaxOverride: providedDurationMax,
    searchMetrics: searchAggregatedTransactions,
  });

  const durationMin = providedDurationMin ?? overallDistribution.durationMin ?? 0;
  const durationMax = providedDurationMax ?? overallDistribution.durationMax ?? 0;
  const totalDocCount = overallDistribution.totalDocCount ?? 0;

  // For error_rate, also get error histogram
  let errorHistogram: UnifiedCorrelationsResponse['errorHistogram'];
  if (correlationType === CorrelationType.ERROR_RATE) {
    const errorDistribution = await getOverallLatencyDistribution({
      chartType,
      apmEventClient,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [query, ...termQuery(EVENT_OUTCOME, EventOutcome.failure)],
        },
      },
      percentileThreshold,
      durationMinOverride: durationMin,
      durationMaxOverride: durationMax,
      searchMetrics: searchAggregatedTransactions,
    });
    errorHistogram = errorDistribution.overallHistogram;
  }

  // Step 2: Get field candidates (if not provided)
  let fieldCandidates: string[];
  if (providedFieldCandidates && providedFieldCandidates.length > 0) {
    fieldCandidates = providedFieldCandidates;
  } else {
    const candidatesResponse = await fetchDurationFieldCandidates({
      apmEventClient,
      eventType: ProcessorEvent.transaction,
      start,
      end,
      environment,
      kuery,
      query,
    });
    fieldCandidates = candidatesResponse.fieldCandidates;

    // For error_rate, filter out EVENT_OUTCOME
    if (correlationType === CorrelationType.ERROR_RATE) {
      fieldCandidates = fieldCandidates.filter((field) => field !== EVENT_OUTCOME);
    }
  }

  // Step 3: Get field value pairs (with internal chunking)
  const fieldValuePairs: FieldValuePair[] = [];
  const fieldCandidateChunks = chunk(fieldCandidates, CHUNK_SIZE);

  for (const fieldCandidateChunk of fieldCandidateChunks) {
    const fieldValuePairResponse = await fetchFieldValuePairs({
      apmEventClient,
      eventType: ProcessorEvent.transaction,
      start,
      end,
      environment,
      kuery,
      query,
      fieldCandidates: fieldCandidateChunk,
    });

    if (fieldValuePairResponse.fieldValuePairs.length > 0) {
      fieldValuePairs.push(...fieldValuePairResponse.fieldValuePairs);
    }
  }

  // Step 4: Get correlations (with internal chunking)
  let correlations: UnifiedCorrelation[] = [];
  let ccsWarning = false;
  let fallbackResult: UnifiedCorrelation | undefined;

  if (correlationType === CorrelationType.ERROR_RATE) {
    // For error_rate, use p-values approach
    const prioritizedFieldValuePairs = getPrioritizedFieldValuePairs(fieldValuePairs);
    const fieldValuePairChunks = chunk(prioritizedFieldValuePairs, CHUNK_SIZE);

    const allFailedCorrelations: UnifiedCorrelation[] = [];
    let bestFallback: UnifiedCorrelation | undefined;

    for (const fieldValuePairChunk of fieldValuePairChunks) {
      // Convert field value pairs to field candidates for p-values
      const fieldCandidatesChunk = Array.from(
        new Set(fieldValuePairChunk.map((pair) => pair.fieldName))
      );

      const pValuesResponse = await fetchPValues({
        apmEventClient,
        start,
        end,
        environment,
        kuery,
        query,
        durationMin,
        durationMax,
        fieldCandidates: fieldCandidatesChunk,
      });

      if (pValuesResponse.failedTransactionsCorrelations.length > 0) {
        allFailedCorrelations.push(...pValuesResponse.failedTransactionsCorrelations);
      }

      if (pValuesResponse.fallbackResult) {
        if (!bestFallback) {
          bestFallback = pValuesResponse.fallbackResult;
        } else if (
          pValuesResponse.fallbackResult.normalizedScore !== undefined &&
          bestFallback.normalizedScore !== undefined &&
          pValuesResponse.fallbackResult.normalizedScore > bestFallback.normalizedScore
        ) {
          bestFallback = pValuesResponse.fallbackResult;
        }
      }

      if (pValuesResponse.ccsWarning) {
        ccsWarning = true;
      }
    }

    correlations = allFailedCorrelations;
    fallbackResult = bestFallback;
  } else {
    // For transaction_duration, use significant correlations approach
    const prioritizedFieldValuePairs = getPrioritizedFieldValuePairs(fieldValuePairs);
    const fieldValuePairChunks = chunk(prioritizedFieldValuePairs, CHUNK_SIZE);

    const allLatencyCorrelations: UnifiedCorrelation[] = [];
    let bestFallback: UnifiedCorrelation | undefined;

    for (const fieldValuePairChunk of fieldValuePairChunks) {
      const significantCorrelationsResponse = await fetchSignificantCorrelations({
        apmEventClient,
        start,
        end,
        environment,
        kuery,
        query,
        durationMinOverride: durationMin,
        durationMaxOverride: durationMax,
        fieldValuePairs: fieldValuePairChunk,
      });

      if (significantCorrelationsResponse.latencyCorrelations.length > 0) {
        allLatencyCorrelations.push(...significantCorrelationsResponse.latencyCorrelations);
      }

      if (significantCorrelationsResponse.fallbackResult) {
        if (!bestFallback) {
          bestFallback = significantCorrelationsResponse.fallbackResult;
        } else {
          const current = significantCorrelationsResponse.fallbackResult;
          if (
            current.correlation !== undefined &&
            current.ksTest !== undefined &&
            bestFallback.correlation !== undefined &&
            bestFallback.ksTest !== undefined &&
            current.correlation > 0 &&
            current.ksTest > bestFallback.ksTest &&
            current.correlation > bestFallback.correlation
          ) {
            bestFallback = current;
          }
        }
      }

      if (significantCorrelationsResponse.ccsWarning) {
        ccsWarning = true;
      }
    }

    correlations = allLatencyCorrelations;
    fallbackResult = bestFallback;
  }

  return {
    overallHistogram: overallDistribution.overallHistogram,
    errorHistogram,
    totalDocCount,
    percentileThresholdValue: overallDistribution.percentileThresholdValue,
    durationMin,
    durationMax,
    fieldCandidates,
    correlations,
    ccsWarning,
    fallbackResult,
  };
}
