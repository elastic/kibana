/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonLocalIndexName } from '@kbn/es-query';
import pLimit from 'p-limit';
import { ERROR_CORRELATION_THRESHOLD } from '../../../../common/correlations/constants';
import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';

import type {
  CommonCorrelationsQueryParams,
  EntityType,
} from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getEventTypeFromEntityType, splitAllSettledPromises } from '../utils';
import { fetchDurationHistogramRangeSteps } from './fetch_duration_histogram_range_steps';
import { fetchFailedEventsCorrelationPValues } from './fetch_failed_events_correlation_p_values';

// This helps avoid circuit breaker exceptions and HTTP 429 errors
const limiter = pLimit(10);

export interface PValuesResponse {
  failedTransactionsCorrelations: FailedTransactionsCorrelation[];
  ccsWarning: boolean;
  fallbackResult?: FailedTransactionsCorrelation;
}

export const fetchPValues = async ({
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  query,
  durationMin,
  durationMax,
  fieldCandidates,
  entityType,
  includeHistogram = true,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  durationMin?: number;
  durationMax?: number;
  fieldCandidates: string[];
  entityType: EntityType;
  includeHistogram?: boolean;
}): Promise<PValuesResponse> => {
  const eventType = getEventTypeFromEntityType(entityType);
  const { rangeSteps } = await fetchDurationHistogramRangeSteps({
    apmEventClient,
    entityType,
    start,
    end,
    environment,
    kuery,
    query,
    durationMinOverride: durationMin,
    durationMaxOverride: durationMax,
  });

  const { fulfilled, rejected } = splitAllSettledPromises(
    await Promise.allSettled(
      fieldCandidates.map((fieldName) =>
        limiter(() =>
          fetchFailedEventsCorrelationPValues({
            apmEventClient,
            start,
            end,
            environment,
            kuery,
            query,
            fieldName,
            rangeSteps,
            entityType,
            includeHistogram,
          })
        )
      )
    )
  );

  const flattenedResults = fulfilled.flat();

  const failedTransactionsCorrelations: FailedTransactionsCorrelation[] = [];
  let fallbackResult: FailedTransactionsCorrelation | undefined;

  flattenedResults.forEach((record) => {
    if (
      record &&
      typeof record.pValue === 'number' &&
      record.pValue < ERROR_CORRELATION_THRESHOLD
    ) {
      failedTransactionsCorrelations.push(record);
    }
    // If there's no result matching the criteria
    // Find the next highest/closest result to the threshold
    // to use as a fallback result
    else if (
      !fallbackResult ||
      (record &&
        typeof record.pValue === 'number' &&
        fallbackResult &&
        typeof fallbackResult.pValue === 'number' &&
        record.pValue < fallbackResult.pValue)
    ) {
      fallbackResult = record;
    }
  });

  const index = apmEventClient.indices[eventType as keyof typeof apmEventClient.indices];

  const ccsWarning = rejected.length > 0 && isNonLocalIndexName(index);

  return { failedTransactionsCorrelations, ccsWarning, fallbackResult };
};
