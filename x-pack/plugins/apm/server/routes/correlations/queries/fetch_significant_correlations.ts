/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';

import { termQuery } from '@kbn/observability-plugin/server';
import type { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
import type {
  CommonCorrelationsQueryParams,
  FieldValuePair,
} from '../../../../common/correlations/types';

import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import { Setup } from '../../../lib/helpers/setup_request';
import {
  computeExpectationsAndRanges,
  splitAllSettledPromises,
} from '../utils';
import { fetchDurationPercentiles } from './fetch_duration_percentiles';
import { fetchDurationCorrelationWithHistogram } from './fetch_duration_correlation_with_histogram';
import { fetchDurationFractions } from './fetch_duration_fractions';
import { fetchDurationHistogramRangeSteps } from './fetch_duration_histogram_range_steps';
import { fetchDurationRanges } from './fetch_duration_ranges';
import { getEventType } from '../utils';

export const fetchSignificantCorrelations = async ({
  setup,
  start,
  end,
  environment,
  kuery,
  query,
  durationMinOverride,
  durationMaxOverride,
  fieldValuePairs,
}: CommonCorrelationsQueryParams & {
  setup: Setup;
  durationMinOverride?: number;
  durationMaxOverride?: number;
  fieldValuePairs: FieldValuePair[];
}) => {
  // Create an array of ranges [2, 4, 6, ..., 98]
  const percentileAggregationPercents = range(2, 100, 2);
  const chartType = LatencyDistributionChartType.latencyCorrelations;
  const searchMetrics = false; // latency correlations does not search metrics documents
  const eventType = getEventType(chartType, searchMetrics);

  const { percentiles: percentilesRecords } = await fetchDurationPercentiles({
    setup,
    chartType,
    start,
    end,
    environment,
    kuery,
    query,
    percents: percentileAggregationPercents,
    searchMetrics,
  });

  // We need to round the percentiles values
  // because the queries we're using based on it
  // later on wouldn't allow numbers with decimals.
  const percentiles = Object.values(percentilesRecords).map(Math.round);

  const { expectations, ranges } = computeExpectationsAndRanges(percentiles);

  const { fractions, totalDocCount } = await fetchDurationFractions({
    setup,
    eventType,
    start,
    end,
    environment,
    kuery,
    query,
    ranges,
  });

  const { rangeSteps } = await fetchDurationHistogramRangeSteps({
    setup,
    chartType,
    start,
    end,
    environment,
    kuery,
    query,
    searchMetrics,
    durationMinOverride,
    durationMaxOverride,
  });

  const { fulfilled, rejected } = splitAllSettledPromises(
    await Promise.allSettled(
      fieldValuePairs.map((fieldValuePair) =>
        fetchDurationCorrelationWithHistogram({
          setup,
          chartType,
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
        })
      )
    )
  );

  const latencyCorrelations = fulfilled.filter(
    (d) => d && 'histogram' in d
  ) as LatencyCorrelation[];

  let fallbackResult: LatencyCorrelation | undefined =
    latencyCorrelations.length > 0
      ? undefined
      : fulfilled
          .filter((d) => !(d as LatencyCorrelation)?.histogram)
          .reduce((d, result) => {
            if (d?.correlation !== undefined) {
              if (!result) {
                result = d?.correlation > 0 ? d : undefined;
              } else {
                if (
                  d.correlation > 0 &&
                  d.ksTest > result.ksTest &&
                  d.correlation > result.correlation
                ) {
                  result = d;
                }
              }
            }
            return result;
          }, undefined);
  if (latencyCorrelations.length === 0 && fallbackResult) {
    const { fieldName, fieldValue } = fallbackResult;
    const { durationRanges: histogram } = await fetchDurationRanges({
      setup,
      chartType,
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
      searchMetrics,
    });

    if (fallbackResult) {
      fallbackResult = {
        ...fallbackResult,
        histogram,
      };
    }
  }

  const index = setup.indices[eventType as keyof typeof setup.indices];

  const ccsWarning = rejected.length > 0 && index.includes(':');

  return {
    latencyCorrelations,
    ccsWarning,
    totalDocCount,
    fallbackResult,
  };
};
