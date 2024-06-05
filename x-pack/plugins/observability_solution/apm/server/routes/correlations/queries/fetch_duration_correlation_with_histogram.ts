/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { termQuery } from '@kbn/observability-plugin/server';
import type {
  CommonCorrelationsQueryParams,
  FieldValuePair,
} from '../../../../common/correlations/types';

import {
  CORRELATION_THRESHOLD,
  KS_TEST_THRESHOLD,
} from '../../../../common/correlations/constants';

import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import { fetchDurationCorrelation } from './fetch_duration_correlation';
import { fetchDurationRanges } from './fetch_duration_ranges';
import { getEventType } from '../utils';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function fetchDurationCorrelationWithHistogram({
  apmEventClient,
  chartType,
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
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  chartType: LatencyDistributionChartType;
  expectations: number[];
  ranges: estypes.AggregationsAggregationRange[];
  fractions: number[];
  histogramRangeSteps: number[];
  totalDocCount: number;
  fieldValuePair: FieldValuePair;
}) {
  const searchMetrics = false; // latency correlations does not search metrics documents
  const eventType = getEventType(chartType, searchMetrics);
  const queryWithFieldValuePair = {
    bool: {
      filter: [query, ...termQuery(fieldValuePair.fieldName, fieldValuePair.fieldValue)],
    },
  };

  const { correlation, ksTest } = await fetchDurationCorrelation({
    apmEventClient,
    eventType,
    start,
    end,
    environment,
    kuery,
    query: queryWithFieldValuePair,
    expectations,
    fractions,
    ranges,
    totalDocCount,
  });

  if (correlation !== null && ksTest !== null && !isNaN(ksTest)) {
    if (correlation > CORRELATION_THRESHOLD && ksTest < KS_TEST_THRESHOLD) {
      const { durationRanges: histogram } = await fetchDurationRanges({
        apmEventClient,
        chartType,
        start,
        end,
        environment,
        kuery,
        query: queryWithFieldValuePair,
        rangeSteps: histogramRangeSteps,
        searchMetrics,
      });
      return {
        ...fieldValuePair,
        correlation,
        ksTest,
        histogram,
      };
    } else {
      return {
        ...fieldValuePair,
        correlation,
        ksTest,
      };
    }
  }

  return undefined;
}
