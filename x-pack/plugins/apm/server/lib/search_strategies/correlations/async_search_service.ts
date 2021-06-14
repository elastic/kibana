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
import { fetchTransactionDurationRanges } from './query_ranges';
import { range } from './utils';

const CORRELATION_THRESHOLD = 0.03;
const KS_TEST_THRESHOLD = 0.1;

export function roundToDecimalPlace(
  num?: number,
  dp: number = 2
): number | string {
  if (num === undefined) return '';
  if (num % 1 === 0) {
    // no decimal place
    return num;
  }

  if (Math.abs(num) < Math.pow(10, -dp)) {
    return Number.parseFloat(String(num)).toExponential(2);
  }
  const m = Math.pow(10, dp);
  return Math.round(num * m) / m;
}

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
    // group duplicates
    // const hashTable: Record<
    //   string,
    //   Record<string, { histogram: HistogramItem[]; duplicates: Set<string> }>
    // > = {};
    // values.forEach((val) => {
    //   const key = `${roundToDecimalPlace(
    //     val.correlation,
    //     4
    //   )}-${roundToDecimalPlace(val.ksTest, 5)}`;
    //   // If table already has something with same pearson correlation & ks test value
    //   // check if distribution also the same
    //   if (hashTable.hasOwnProperty(key)) {
    //     const hashedArr = Object.values(hashTable[key]);
    //     const firstDuplicateIdx = hashedArr.findIndex((hashedVal) =>
    //       isEqual(hashedVal.histogram, val.histogram)
    //     );
    //
    //     // If has same score but different histogram
    //     if (firstDuplicateIdx === -1) {
    //       hashTable[key] = {
    //         [val.value]: {
    //           histogram: val.histogram,
    //           duplicates: new Set([val.value]),
    //         },
    //       };
    //     } else {
    //       // If both pearson and ks tests values and histogram are the same
    //       hashedArr[firstDuplicateIdx].duplicates.add(val.value);
    //       // hashTable[key][values .duplicateCount = hashTable[key].duplicateCount + 1;
    //     }
    //   } else {
    //     hashTable[key] = {
    //       [val.value]: {
    //         histogram: val.histogram,
    //         duplicates: new Set([val.value]),
    //       },
    //     };
    //   }
    // });
    //
    // console.log('---HASHTABLE---');
    // console.log(JSON.stringify(hashTable));
    const uniqueValues = uniqWith(
      values.sort((a, b) => b.correlation - a.correlation),
      (a, b) => {
        const isDuplicate =
          isEqual(
            roundToDecimalPlace(b.correlation, 3),
            roundToDecimalPlace(a.correlation, 3)
          ) &&
          isEqual(
            roundToDecimalPlace(b.ksTest, 3),
            roundToDecimalPlace(a.ksTest, 3)
          );
        return isDuplicate;
      }
    )
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, 15);

    return {
      error,
      isRunning,
      loaded: Math.round(progress.getOverallProgress() * 100),
      started: progress.started,
      total: 100,
      values: uniqueValues,
      percentileThresholdValue,
      cancel,
    };
  };
};
