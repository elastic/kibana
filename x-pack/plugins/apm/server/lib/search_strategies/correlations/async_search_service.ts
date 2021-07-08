/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shuffle, range } from 'lodash';
import type { ElasticsearchClient } from 'src/core/server';
import { fetchTransactionDurationFieldCandidates } from './query_field_candidates';
import { fetchTransactionDurationFieldValuePairs } from './query_field_value_pairs';
import { fetchTransactionDurationPercentiles } from './query_percentiles';
import { fetchTransactionDurationCorrelation } from './query_correlation';
import { fetchTransactionDurationHistogramRangeSteps } from './query_histogram_range_steps';
import { fetchTransactionDurationRanges, HistogramItem } from './query_ranges';
import type {
  AsyncSearchProviderProgress,
  SearchServiceParams,
  SearchServiceValue,
} from '../../../../common/search_strategies/correlations/types';
import { computeExpectationsAndRanges } from './utils/aggregation_utils';
import { fetchTransactionDurationFractions } from './query_fractions';

const CORRELATION_THRESHOLD = 0.3;
const KS_TEST_THRESHOLD = 0.1;

export const asyncSearchServiceProvider = (
  esClient: ElasticsearchClient,
  params: SearchServiceParams
) => {
  let isCancelled = false;
  let isRunning = true;
  let error: Error;

  const progress: AsyncSearchProviderProgress = {
    started: Date.now(),
    loadedHistogramStepsize: 0,
    loadedOverallHistogram: 0,
    loadedFieldCanditates: 0,
    loadedFieldValuePairs: 0,
    loadedHistograms: 0,
    getOverallProgress: () =>
      progress.loadedHistogramStepsize * 0.025 +
      progress.loadedOverallHistogram * 0.025 +
      progress.loadedFieldCanditates * 0.025 +
      progress.loadedFieldValuePairs * 0.025 +
      progress.loadedHistograms * 0.9,
  };

  const values: SearchServiceValue[] = [];
  let overallHistogram: HistogramItem[] | undefined;

  let percentileThresholdValue: number;

  const cancel = () => {
    isCancelled = true;
  };

  const fetchCorrelations = async () => {
    try {
      // 95th percentile to be displayed as a marker in the log log chart
      const percentileThreshold = await fetchTransactionDurationPercentiles(
        esClient,
        params,
        params.percentileThreshold ? [params.percentileThreshold] : undefined
      );
      percentileThresholdValue =
        percentileThreshold[`${params.percentileThreshold}.0`];

      // finish early if we weren't able to identify the percentileThresholdValue.
      if (percentileThresholdValue === undefined) {
        progress.loadedHistogramStepsize = 1;
        progress.loadedOverallHistogram = 1;
        progress.loadedFieldCanditates = 1;
        progress.loadedFieldValuePairs = 1;
        progress.loadedHistograms = 1;
        isRunning = false;
        return;
      }

      const histogramRangeSteps = await fetchTransactionDurationHistogramRangeSteps(
        esClient,
        params
      );
      progress.loadedHistogramStepsize = 1;

      if (isCancelled) {
        isRunning = false;
        return;
      }

      const overallLogHistogramChartData = await fetchTransactionDurationRanges(
        esClient,
        params,
        histogramRangeSteps
      );
      progress.loadedOverallHistogram = 1;
      overallHistogram = overallLogHistogramChartData;

      if (isCancelled) {
        isRunning = false;
        return;
      }

      // Create an array of ranges [2, 4, 6, ..., 98]
      const percents = Array.from(range(2, 100, 2));
      const percentilesRecords = await fetchTransactionDurationPercentiles(
        esClient,
        params,
        percents
      );
      const percentiles = Object.values(percentilesRecords);

      if (isCancelled) {
        isRunning = false;
        return;
      }

      const { fieldCandidates } = await fetchTransactionDurationFieldCandidates(
        esClient,
        params
      );

      progress.loadedFieldCanditates = 1;

      const fieldValuePairs = await fetchTransactionDurationFieldValuePairs(
        esClient,
        params,
        fieldCandidates,
        progress
      );

      if (isCancelled) {
        isRunning = false;
        return;
      }

      const { expectations, ranges } = computeExpectationsAndRanges(
        percentiles
      );

      const {
        fractions,
        totalDocCount,
      } = await fetchTransactionDurationFractions(esClient, params, ranges);

      async function* fetchTransactionDurationHistograms() {
        for (const item of shuffle(fieldValuePairs)) {
          if (item === undefined || isCancelled) {
            isRunning = false;
            return;
          }

          // If one of the fields have an error
          // We don't want to stop the whole process
          try {
            const {
              correlation,
              ksTest,
            } = await fetchTransactionDurationCorrelation(
              esClient,
              params,
              expectations,
              ranges,
              fractions,
              totalDocCount,
              item.field,
              item.value
            );

            if (isCancelled) {
              isRunning = false;
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
            error = e;
          }
        }
      }

      let loadedHistograms = 0;
      for await (const item of fetchTransactionDurationHistograms()) {
        if (item !== undefined) {
          values.push(item);
        }
        loadedHistograms++;
        progress.loadedHistograms = loadedHistograms / fieldValuePairs.length;
      }
    } catch (e) {
      error = e;
    }

    isRunning = false;
  };

  fetchCorrelations();

  return () => {
    const sortedValues = values.sort((a, b) => b.correlation - a.correlation);

    return {
      error,
      isRunning,
      loaded: Math.round(progress.getOverallProgress() * 100),
      overallHistogram,
      started: progress.started,
      total: 100,
      values: sortedValues,
      percentileThresholdValue,
      cancel,
    };
  };
};
