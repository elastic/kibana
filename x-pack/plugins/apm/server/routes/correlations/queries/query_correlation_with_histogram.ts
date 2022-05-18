/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';

import type {
  FieldValuePair,
  CorrelationsParams,
} from '../../../../common/correlations/types';

import type { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
import {
  CORRELATION_THRESHOLD,
  KS_TEST_THRESHOLD,
} from '../../../../common/correlations/constants';

import { fetchTransactionDurationCorrelation } from './query_correlation';
import { fetchTransactionDurationRanges } from './query_ranges';

export async function fetchTransactionDurationCorrelationWithHistogram(
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
  expectations: number[],
  ranges: estypes.AggregationsAggregationRange[],
  fractions: number[],
  histogramRangeSteps: number[],
  totalDocCount: number,
  fieldValuePair: FieldValuePair
) {
  const { correlation, ksTest } = await fetchTransactionDurationCorrelation(
    esClient,
    params,
    expectations,
    ranges,
    fractions,
    totalDocCount,
    [fieldValuePair]
  );

  if (correlation !== null && ksTest !== null && !isNaN(ksTest)) {
    if (correlation > CORRELATION_THRESHOLD && ksTest < KS_TEST_THRESHOLD) {
      const logHistogram = await fetchTransactionDurationRanges(
        esClient,
        params,
        histogramRangeSteps,
        [fieldValuePair]
      );
      return {
        ...fieldValuePair,
        correlation,
        ksTest,
        histogram: logHistogram,
      } as LatencyCorrelation;
    } else {
      return {
        ...fieldValuePair,
        correlation,
        ksTest,
      } as Omit<LatencyCorrelation, 'histogram'>;
    }
  }

  return undefined;
}
