/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';

import { termQuery } from '@kbn/observability-plugin/server';
import { isNonLocalIndexName } from '@kbn/es-query';
import type { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
import type {
  CommonCorrelationsQueryParams,
  EntityType,
  FieldValuePair,
} from '../../../../common/correlations/types';

import {
  CORRELATION_THRESHOLD,
  KS_TEST_THRESHOLD,
} from '../../../../common/correlations/constants';
import { computeExpectationsAndRanges, splitAllSettledPromises } from '../utils';
import { fetchDurationPercentiles } from './fetch_duration_percentiles';
import { fetchDurationCorrelationWithHistogram } from './fetch_duration_correlation_with_histogram';
import { fetchDurationFractions } from './fetch_duration_fractions';
import { fetchDurationHistogramRangeSteps } from './fetch_duration_histogram_range_steps';
import { fetchDurationRanges } from './fetch_duration_ranges';
import { getEventTypeFromEntityType } from '../utils';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export interface SignificantCorrelationsResponse {
  latencyCorrelations: LatencyCorrelation[];
  ccsWarning: boolean;
  totalDocCount: number;
  fallbackResult?: LatencyCorrelation;
}

function isSignificantLatencyCorrelation(
  d: unknown,
  includeHistogram: boolean
): d is LatencyCorrelation {
  const c = d as LatencyCorrelation | undefined;
  if (
    !c ||
    c.correlation === undefined ||
    c.ksTest === undefined ||
    c.correlation <= CORRELATION_THRESHOLD ||
    c.ksTest >= KS_TEST_THRESHOLD
  ) {
    return false;
  }
  if (includeHistogram && c.histogram === undefined) {
    return false;
  }
  return true;
}

export const fetchSignificantCorrelations = async ({
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  query,
  durationMinOverride,
  durationMaxOverride,
  fieldValuePairs,
  entityType,
  includeHistogram = true,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  durationMinOverride?: number;
  durationMaxOverride?: number;
  fieldValuePairs: FieldValuePair[];
  entityType: EntityType;
  includeHistogram?: boolean;
}): Promise<SignificantCorrelationsResponse> => {
  // Create an array of ranges [2, 4, 6, ..., 98]
  const percentileAggregationPercents = range(2, 100, 2);
  const eventType = getEventTypeFromEntityType(entityType);

  const { percentiles: percentilesRecords } = await fetchDurationPercentiles({
    apmEventClient,
    entityType,
    start,
    end,
    environment,
    kuery,
    query,
    percents: percentileAggregationPercents,
  });

  // We need to round the percentiles values
  // because the queries we're using based on it
  // later on wouldn't allow numbers with decimals.
  const percentiles = Object.values(percentilesRecords).map(Math.round);

  const { expectations, ranges } = computeExpectationsAndRanges(percentiles);

  const { fractions, totalDocCount } = await fetchDurationFractions({
    apmEventClient,
    eventType,
    start,
    end,
    environment,
    kuery,
    query,
    ranges,
  });

  const { rangeSteps } = await fetchDurationHistogramRangeSteps({
    apmEventClient,
    entityType,
    start,
    end,
    environment,
    kuery,
    query,
    durationMinOverride,
    durationMaxOverride,
  });

  const { fulfilled, rejected } = splitAllSettledPromises(
    await Promise.allSettled(
      fieldValuePairs.map((fieldValuePair) =>
        fetchDurationCorrelationWithHistogram({
          apmEventClient,
          entityType,
          start,
          end,
          environment,
          kuery,
          query,
          expectations,
          ranges,
          fractions,
          histogramRangeSteps: rangeSteps,
          totalDocCount,
          fieldValuePair,
          includeHistogram,
        })
      )
    )
  );

  const latencyCorrelations = fulfilled.filter((d) =>
    isSignificantLatencyCorrelation(d, includeHistogram)
  ) as LatencyCorrelation[];

  let fallbackResult: LatencyCorrelation | undefined =
    latencyCorrelations.length > 0
      ? undefined
      : fulfilled
          .filter((d) => !isSignificantLatencyCorrelation(d, includeHistogram))
          .reduce<LatencyCorrelation | undefined>((best, current) => {
            if (current?.correlation === undefined) {
              return best;
            }
            if (!best) {
              return current.correlation > 0 ? current : undefined;
            }
            if (
              current.correlation > 0 &&
              current.ksTest > best.ksTest &&
              current.correlation > best.correlation
            ) {
              return current;
            }
            return best;
          }, undefined);
  if (includeHistogram && latencyCorrelations.length === 0 && fallbackResult) {
    const { fieldName, fieldValue } = fallbackResult;
    const { durationRanges: histogram } = await fetchDurationRanges({
      apmEventClient,
      entityType,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [query, ...termQuery(fieldName, fieldValue)],
        },
      },
      rangeSteps,
    });

    if (fallbackResult) {
      fallbackResult = {
        ...fallbackResult,
        histogram,
      };
    }
  }

  const index = apmEventClient.indices[eventType as keyof typeof apmEventClient.indices];

  const ccsWarning = rejected.length > 0 && isNonLocalIndexName(index);

  return {
    latencyCorrelations,
    ccsWarning,
    totalDocCount,
    fallbackResult,
  };
};
