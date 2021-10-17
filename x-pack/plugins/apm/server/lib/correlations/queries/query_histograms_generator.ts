/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import type {
  FieldValuePair,
  SearchStrategyParams,
} from '../../../../common/correlations/types';

import type { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';

import { CORRELATION_THRESHOLD, KS_TEST_THRESHOLD } from '../constants';

import { getPrioritizedFieldValuePairs } from './get_prioritized_field_value_pairs';
import { fetchTransactionDurationCorrelation } from './query_correlation';
import { fetchTransactionDurationRanges } from './query_ranges';

export async function* fetchTransactionDurationHistograms(
  esClient: ElasticsearchClient,
  params: SearchStrategyParams,
  expectations: number[],
  ranges: estypes.AggregationsAggregationRange[],
  fractions: number[],
  histogramRangeSteps: number[],
  totalDocCount: number,
  fieldValuePairs: FieldValuePair[]
) {
  for (const item of getPrioritizedFieldValuePairs(fieldValuePairs)) {
    if (params === undefined || item === undefined) {
      return;
    }

    // If one of the fields have an error
    // We don't want to stop the whole process
    try {
      const { correlation, ksTest } = await fetchTransactionDurationCorrelation(
        esClient,
        params,
        expectations,
        ranges,
        fractions,
        totalDocCount,
        [item]
      );

      if (
        correlation !== null &&
        correlation > CORRELATION_THRESHOLD &&
        ksTest !== null &&
        ksTest < KS_TEST_THRESHOLD
      ) {
        const logHistogram = await fetchTransactionDurationRanges(
          esClient,
          params,
          histogramRangeSteps,
          [item]
        );
        yield {
          ...item,
          correlation,
          ksTest,
          histogram: logHistogram,
        } as LatencyCorrelation;
      } else {
        yield undefined;
      }
    } catch (e) {
      yield { error: e };
    }
  }
}
