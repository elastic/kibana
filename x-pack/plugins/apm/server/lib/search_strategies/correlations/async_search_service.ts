/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  descending,
  // group,
  sum,
} from 'd3-array';
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
import { fetchTransactionDurationRanges } from './query_ranges';

const PERCENTILES = 20;
const CORRELATION_THRESHOLD = 0.03;
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
      progress.loadedHistogramStepsize * 0.05 +
      progress.loadedOverallHistogram * 0.05 +
      progress.loadedFieldCanditates * 0.05 +
      progress.loadedFieldValuePairs * 0.05 +
      progress.loadedHistograms * 0.8,
  };

  const values: SearchServiceValue[] = [];
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
        [...Array(PERCENTILES).keys()]
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
              ksTest,
              histogram: fullHistogram,
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
    function slownessScore(d: SearchServiceValue) {
      // fast docs for this field/value pair below the percentile threshold
      const allFastValueCount = sum(
        d.histogram
          .filter((h) => h.key < (percentileThresholdValue ?? 0))
          .map((h) => h.doc_count_full)
      );
      const fastValueCount = sum(
        d.histogram
          .filter((h) => h.key < (percentileThresholdValue ?? 0))
          .map((h) => h.doc_count)
      );
      // slow docs for this field/value pair above the percentile threshold
      const allSlowValueCount = sum(
        d.histogram
          .filter((h) => h.key >= (percentileThresholdValue ?? 0))
          .map((h) => h.doc_count_full)
      );
      const slowValueCount = sum(
        d.histogram
          .filter((h) => h.key >= (percentileThresholdValue ?? 0))
          .map((h) => h.doc_count)
      );

      const fastPercent = fastValueCount / allFastValueCount;
      const slowPercent = slowValueCount / allSlowValueCount;
      return slowPercent / fastPercent;
    }

    // group duplicates
    // const groupedValues = group(values, (d) => JSON.stringify(d.histogram));
    // console.log('groupedValues', groupedValues);

    const uniqueValues = uniqWith(values, (a, b) =>
      isEqual(a.histogram, b.histogram)
    )
      .sort((a, b) => descending(slownessScore(a), slownessScore(b)))
      .slice(0, 15);

    return {
      error,
      isRunning,
      loaded: Math.floor(progress.getOverallProgress() * 100),
      started: progress.started,
      total: 100,
      values: uniqueValues,
      percentileThresholdValue,
      cancel,
    };
  };
};
