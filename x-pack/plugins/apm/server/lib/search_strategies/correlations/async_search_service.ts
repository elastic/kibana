/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shuffle, uniqWith, isEqual } from 'lodash';

import type { ElasticsearchClient } from 'src/core/server';

import type {
  AsyncSearchProviderProgress,
  SearchServiceParams,
  SearchServiceValue,
} from '../../../../common/search_strategies/correlations/types';

import { fetchTransactionDurationFieldCandidates } from './query_field_candidates';
import { fetchTransactionDurationFieldValuePairs } from './query_field_value_pairs';
import { fetchTransactionDurationPecentiles } from './query_percentiles';
import { fetchTransactionDurationCorrelation } from './query_correlation';
import { fetchTransactionDurationHistogramRangesteps } from './query_histogram_rangesteps';
import { fetchTransactionDurationRanges, HistogramItem } from './query_ranges';
import { isHistogramRoughlyEqual, range } from './utils';
import { roundToDecimalPlace } from '../../../../common/search_strategies/correlations/formatting_utils';

const CORRELATION_THRESHOLD = 0.3;
const KS_TEST_THRESHOLD = 0.1;
const SIGNIFICANT_FRACTION = 3;
const MAX_CORRELATIONS_TO_SHOW = 15;

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
      const percentileThreshold = await fetchTransactionDurationPecentiles(
        esClient,
        params,
        params.percentileThreshold ? [params.percentileThreshold] : undefined
      );
      percentileThresholdValue =
        percentileThreshold[`${params.percentileThreshold}.0`];

      const histogramRangeSteps = await fetchTransactionDurationHistogramRangesteps(
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

      const {
        fieldCandidates,
        totalHits,
      } = await fetchTransactionDurationFieldCandidates(esClient, params);

      progress.loadedFieldCanditates = 1;

      // Create an array of ranges [2, 4, 6, ..., 98]
      const percents = Array.from(range(2, 100, 2));
      const percentiles = await fetchTransactionDurationPecentiles(
        esClient,
        params,
        percents
      );

      if (isCancelled) {
        isRunning = false;
        return;
      }

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

      async function* fetchTransactionDurationHistograms() {
        for (const item of shuffle(fieldValuePairs)) {
          if (item === undefined || isCancelled) {
            isRunning = false;
            return;
          }

          const {
            correlation,
            ksTest,
          } = await fetchTransactionDurationCorrelation(
            esClient,
            params,
            percentiles,
            totalHits,
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

      isRunning = false;
    } catch (e) {
      error = e;
    }
  };

  fetchCorrelations();

  return () => {
    // Remove duplicates
    const uniqueValues = uniqWith(
      values.sort((a, b) => b.correlation - a.correlation),
      (a, b) => {
        // Row/value is considered duplicates of others
        // if they both have roughly same pearson correlation and ks test values
        // And the histograms are the same
        return (
          isEqual(
            roundToDecimalPlace(b.correlation, SIGNIFICANT_FRACTION),
            roundToDecimalPlace(a.correlation, SIGNIFICANT_FRACTION)
          ) &&
          isEqual(
            roundToDecimalPlace(b.ksTest, SIGNIFICANT_FRACTION),
            roundToDecimalPlace(a.ksTest, SIGNIFICANT_FRACTION)
          ) &&
          // Here we only check if they are roughly equal by comparing 10 random bins
          // because it's computation intensive to check all bin
          isHistogramRoughlyEqual(b.histogram, a.histogram, {
            significantFraction: SIGNIFICANT_FRACTION,
          })
        );
      }
    )
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, MAX_CORRELATIONS_TO_SHOW);

    return {
      error,
      isRunning,
      loaded: Math.round(progress.getOverallProgress() * 100),
      overallHistogram,
      started: progress.started,
      total: 100,
      values: uniqueValues,
      percentileThresholdValue,
      cancel,
    };
  };
};
