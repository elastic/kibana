/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shuffle } from 'lodash';

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
import { fetchTransactionDurationRanges } from './query_ranges';

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
      progress.loadedHistogramStepsize * 0.05 +
      progress.loadedOverallHistogram * 0.05 +
      progress.loadedFieldCanditates * 0.05 +
      progress.loadedFieldValuePairs * 0.05 +
      progress.loadedHistograms * 0.8,
  };

  let values: SearchServiceValue[] = [];
  let percentileThresholdValue: number;

  const cancel = () => {
    isCancelled = true;
  };

  const fetchCorrelations = async () => {
    try {
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

      if (isCancelled) {
        isRunning = false;
        return;
      }

      const {
        fieldCandidates,
        totalHits,
      } = await fetchTransactionDurationFieldCandidates(esClient, params);
      progress.loadedFieldCanditates = 1;

      const percentiles = await fetchTransactionDurationPecentiles(
        esClient,
        params,
        [...Array(100).keys()]
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

          const logHistogram = await fetchTransactionDurationRanges(
            esClient,
            params,
            histogramRangeSteps,
            item.field,
            item.value
          );

          const { correlation } = await fetchTransactionDurationCorrelation(
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

          const fullHistogram = overallLogHistogramChartData.map((h) => {
            const histogramItem = logHistogram.find((di) => di.key === h.key);
            const docCount =
              item !== undefined && histogramItem !== undefined
                ? histogramItem.doc_count
                : 0;
            return {
              key: h.key,
              doc_count_full: h.doc_count,
              doc_count: docCount,
            };
          });

          yield {
            ...item,
            correlation,
            histogram: fullHistogram,
          };
        }
      }

      let loadedHistograms = 0;
      for await (const item of fetchTransactionDurationHistograms()) {
        values.push(item);
        values = values
          .sort((a, b) => b.correlation - a.correlation)
          .slice(0, 15);
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
    return {
      error,
      isRunning,
      loaded: Math.floor(progress.getOverallProgress() * 100),
      started: progress.started,
      total: 100,
      values,
      percentileThresholdValue,
      cancel,
    };
  };
};
