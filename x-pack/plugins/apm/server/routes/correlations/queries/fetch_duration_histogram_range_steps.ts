/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLog } from 'd3-scale';

import { isFiniteNumber } from '@kbn/observability-plugin/common/utils/is_finite_number';
import { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';
import { getDurationField, getEventType } from '../utils';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getBackwardCompatibleDocumentTypeFilter } from '../../../lib/helpers/transactions';

const getHistogramRangeSteps = (min: number, max: number, steps: number) => {
  // A d3 based scale function as a helper to get equally distributed bins on a log scale.
  // We round the final values because the ES range agg we use won't accept numbers with decimals for `transaction.duration.us`.
  const logFn = scaleLog().domain([min, max]).range([1, steps]);
  return [...Array(steps).keys()]
    .map(logFn.invert)
    .map((d) => (isNaN(d) ? 0 : Math.round(d)));
};

export const fetchDurationHistogramRangeSteps = async ({
  chartType,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  query,
  searchMetrics,
  durationMinOverride,
  durationMaxOverride,
}: CommonCorrelationsQueryParams & {
  chartType: LatencyDistributionChartType;
  apmEventClient: APMEventClient;
  searchMetrics: boolean;
  durationMinOverride?: number;
  durationMaxOverride?: number;
}): Promise<{
  durationMin?: number;
  durationMax?: number;
  rangeSteps: number[];
}> => {
  const steps = 100;

  if (durationMinOverride && durationMaxOverride) {
    return {
      durationMin: durationMinOverride,
      durationMax: durationMaxOverride,
      rangeSteps: getHistogramRangeSteps(
        durationMinOverride,
        durationMaxOverride,
        steps
      ),
    };
  }

  const durationField = getDurationField(chartType, searchMetrics);

  // when using metrics data, ensure we filter by docs with the appropriate duration field
  const filteredQuery = searchMetrics
    ? {
        bool: {
          filter: [query, ...getBackwardCompatibleDocumentTypeFilter(true)],
        },
      }
    : query;

  const resp = await apmEventClient.search(
    'get_duration_histogram_range_steps',
    {
      apm: {
        events: [getEventType(chartType, searchMetrics)],
      },
      body: {
        track_total_hits: 1,
        size: 0,
        query: getCommonCorrelationsQuery({
          start,
          end,
          environment,
          kuery,
          query: filteredQuery,
        }),
        aggs: {
          duration_min: { min: { field: durationField } },
          duration_max: { max: { field: durationField } },
        },
      },
    }
  );

  if (resp.hits.total.value === 0) {
    return { rangeSteps: getHistogramRangeSteps(0, 1, 100) };
  }

  if (
    !resp.aggregations ||
    !(
      isFiniteNumber(resp.aggregations.duration_min.value) &&
      isFiniteNumber(resp.aggregations.duration_max.value)
    )
  ) {
    return { rangeSteps: [] };
  }

  const durationMin = resp.aggregations.duration_min.value;
  const durationMax = resp.aggregations.duration_max.value * 2;

  return {
    durationMin,
    durationMax,
    rangeSteps: getHistogramRangeSteps(durationMin, durationMax, steps),
  };
};
