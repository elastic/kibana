/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import type { SearchServiceFetchParams } from '../../../../../common/search_strategies/correlations/types';

import type { AsyncSearchServiceLog } from '../async_search_service_log';
import type { AsyncSearchServiceState } from '../async_search_service_state';
import { CORRELATION_THRESHOLD, KS_TEST_THRESHOLD } from '../constants';

import { getPrioritizedFieldValuePairs } from './get_prioritized_field_value_pairs';
import { fetchTransactionDurationCorrelation } from './query_correlation';
import { fetchTransactionDurationRanges } from './query_ranges';

import type { FieldValuePairs } from './query_field_value_pairs';

export async function* fetchTransactionDurationHistograms(
  esClient: ElasticsearchClient,
  addLogMessage: AsyncSearchServiceLog['addLogMessage'],
  params: SearchServiceFetchParams,
  state: AsyncSearchServiceState,
  expectations: number[],
  ranges: estypes.AggregationsAggregationRange[],
  fractions: number[],
  histogramRangeSteps: number[],
  totalDocCount: number,
  fieldValuePairs: FieldValuePairs
) {
  for (const item of getPrioritizedFieldValuePairs(fieldValuePairs)) {
    if (params === undefined || item === undefined || state.getIsCancelled()) {
      state.setIsRunning(false);
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
        item.field,
        item.value
      );

      if (state.getIsCancelled()) {
        state.setIsRunning(false);
        return;
      }

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
          item.field,
          item.value
        );
        yield {
          ...item,
          correlation,
          ksTest,
          histogram: logHistogram,
        };
      } else {
        yield undefined;
      }
    } catch (e) {
      // don't fail the whole process for individual correlation queries,
      // just add the error to the internal log and check if we'd want to set the
      // cross-cluster search compatibility warning to true.
      addLogMessage(
        `Failed to fetch correlation/kstest for '${item.field}/${item.value}'`,
        JSON.stringify(e)
      );
      if (params?.index.includes(':')) {
        state.setCcsWarning(true);
      }
      yield undefined;
    }
  }
}
