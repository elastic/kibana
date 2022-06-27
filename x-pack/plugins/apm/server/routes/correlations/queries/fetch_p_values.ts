/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ERROR_CORRELATION_THRESHOLD } from '../../../../common/correlations/constants';
import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';

import { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../../lib/helpers/setup_request';
import { splitAllSettledPromises } from '../utils';
import { fetchDurationHistogramRangeSteps } from './fetch_duration_histogram_range_steps';
import { fetchFailedEventsCorrelationPValues } from './fetch_failed_events_correlation_p_values';

export const fetchPValues = async ({
  setup,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  fieldCandidates,
}: CommonCorrelationsQueryParams & {
  setup: Setup;
  eventType: ProcessorEvent;
  fieldCandidates: string[];
}) => {
  const rangeSteps = await fetchDurationHistogramRangeSteps({
    setup,
    eventType,
    start,
    end,
    environment,
    kuery,
    query,
  });

  const { fulfilled, rejected } = splitAllSettledPromises(
    await Promise.allSettled(
      fieldCandidates.map((fieldName) =>
        fetchFailedEventsCorrelationPValues({
          setup,
          eventType,
          start,
          end,
          environment,
          kuery,
          query,
          fieldName,
          rangeSteps,
        })
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
    } else {
      // If there's no result matching the criteria
      // Find the next highest/closest result to the threshold
      // to use as a fallback result
      if (!fallbackResult) {
        fallbackResult = record;
      } else {
        if (
          record.pValue !== null &&
          fallbackResult &&
          fallbackResult.pValue !== null &&
          record.pValue < fallbackResult.pValue
        ) {
          fallbackResult = record;
        }
      }
    }
  });

  const index = setup.indices[eventType as keyof typeof setup.indices];

  const ccsWarning = rejected.length > 0 && index.includes(':');

  return { failedTransactionsCorrelations, ccsWarning, fallbackResult };
};
