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

import { ProcessorEvent } from '../../../../common/processor_event';
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

export const fetchSignificantCorrelations = async ({
  setup,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  fieldValuePairs,
}: CommonCorrelationsQueryParams & {
  setup: Setup;
  eventType: ProcessorEvent;
  fieldValuePairs: FieldValuePair[];
}) => {
  // Create an array of ranges [2, 4, 6, ..., 98]
  const percentileAggregationPercents = range(2, 100, 2);
  const { percentiles: percentilesRecords } = await fetchDurationPercentiles({
    setup,
    eventType,
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
    setup,
    eventType,
    start,
    end,
    environment,
    kuery,
    query,
    ranges,
  });

  const histogramRangeSteps = await fetchDurationHistogramRangeSteps({
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
      fieldValuePairs.map((fieldValuePair) =>
        fetchDurationCorrelationWithHistogram({
          setup,
          eventType,
          start,
          end,
          environment,
          kuery,
          query,
          expectations,
          ranges,
          fractions,
          histogramRangeSteps,
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
    const logHistogram = await fetchDurationRanges({
      setup,
      eventType,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [query, ...termQuery(fieldName, fieldValue)],
        },
      },
      rangeSteps: histogramRangeSteps,
    });

    if (fallbackResult) {
      fallbackResult = {
        ...fallbackResult,
        histogram: logHistogram,
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
