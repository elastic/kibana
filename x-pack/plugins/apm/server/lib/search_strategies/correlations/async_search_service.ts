/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shuffle, range } from 'lodash';
import type { ElasticsearchClient } from 'src/core/server';
import type {
  SearchServiceParams,
  SearchServiceFetchParams,
} from '../../../../common/search_strategies/correlations/types';
import type { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import {
  fetchTransactionDurationFieldCandidates,
  fetchTransactionDurationFieldValuePairs,
  fetchTransactionDurationFractions,
  fetchTransactionDurationPercentiles,
  fetchTransactionDurationCorrelation,
  fetchTransactionDurationHistogramRangeSteps,
  fetchTransactionDurationRanges,
} from './queries';
import { computeExpectationsAndRanges, currentTimeAsString } from './utils';
import { CORRELATION_THRESHOLD, KS_TEST_THRESHOLD } from './constants';
import { asyncSearchServiceStateProvider } from './async_search_service_state';

export const asyncSearchServiceProvider = (
  esClient: ElasticsearchClient,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  searchServiceParams: SearchServiceParams,
  includeFrozen: boolean
) => {
  const state = asyncSearchServiceStateProvider();
  const log: string[] = [];
  const logMessage = (message: string) =>
    log.push(`${currentTimeAsString()}: ${message}`);

  function cancel() {
    logMessage(`Service cancelled.`);
    state.setIsCancelled(true);
  }

  async function fetchCorrelations() {
    let params: SearchServiceFetchParams | undefined;

    try {
      const indices = await getApmIndices();
      params = {
        ...searchServiceParams,
        index: indices['apm_oss.transactionIndices'],
      };

      // 95th percentile to be displayed as a marker in the log log chart
      const {
        totalDocs,
        percentiles: percentileThreshold,
      } = await fetchTransactionDurationPercentiles(
        esClient,
        params,
        params.percentileThreshold ? [params.percentileThreshold] : undefined
      );
      const percentileThresholdValue =
        percentileThreshold[`${params.percentileThreshold}.0`];
      state.setPercentileThresholdValue(percentileThresholdValue);

      logMessage(
        `Fetched ${params.percentileThreshold}th percentile value of ${percentileThresholdValue} based on ${totalDocs} documents.`
      );

      // finish early if we weren't able to identify the percentileThresholdValue.
      if (percentileThresholdValue === undefined) {
        logMessage(
          `Abort service since percentileThresholdValue could not be determined.`
        );
        state.setProgress({
          loadedHistogramStepsize: 1,
          loadedOverallHistogram: 1,
          loadedFieldCanditates: 1,
          loadedFieldValuePairs: 1,
          loadedHistograms: 1,
        });
        state.setIsRunning(false);
        return;
      }

      const histogramRangeSteps = await fetchTransactionDurationHistogramRangeSteps(
        esClient,
        params
      );
      state.setProgress({ loadedHistogramStepsize: 1 });

      logMessage(`Loaded histogram range steps.`);

      if (state.getState().isCancelled) {
        state.setIsRunning(false);
        return;
      }

      const overallLogHistogramChartData = await fetchTransactionDurationRanges(
        esClient,
        params,
        histogramRangeSteps
      );
      state.setProgress({ loadedOverallHistogram: 1 });
      state.setOverallHistogram(overallLogHistogramChartData);

      logMessage(`Loaded overall histogram chart data.`);

      if (state.getState().isCancelled) {
        state.setIsRunning(false);
        return;
      }

      // Create an array of ranges [2, 4, 6, ..., 98]
      const percents = Array.from(range(2, 100, 2));
      const {
        percentiles: percentilesRecords,
      } = await fetchTransactionDurationPercentiles(esClient, params, percents);
      const percentiles = Object.values(percentilesRecords);

      logMessage(`Loaded percentiles.`);

      if (state.getState().isCancelled) {
        state.setIsRunning(false);
        return;
      }

      const { fieldCandidates } = await fetchTransactionDurationFieldCandidates(
        esClient,
        params
      );

      logMessage(`Identified ${fieldCandidates.length} fieldCandidates.`);

      state.setProgress({ loadedFieldCanditates: 1 });

      const fieldValuePairs = await fetchTransactionDurationFieldValuePairs(
        esClient,
        params,
        fieldCandidates,
        state
      );

      logMessage(`Identified ${fieldValuePairs.length} fieldValuePairs.`);

      if (state.getState().isCancelled) {
        state.setIsRunning(false);
        return;
      }

      const { expectations, ranges } = computeExpectationsAndRanges(
        percentiles
      );

      const {
        fractions,
        totalDocCount,
      } = await fetchTransactionDurationFractions(esClient, params, ranges);

      logMessage(`Loaded fractions and totalDocCount of ${totalDocCount}.`);

      async function* fetchTransactionDurationHistograms() {
        for (const item of shuffle(fieldValuePairs)) {
          if (
            params === undefined ||
            item === undefined ||
            state.getState().isCancelled
          ) {
            state.setIsRunning(false);
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

            if (state.getState().isCancelled) {
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
            logMessage(
              `Failed to fetch correlation/kstest for '${item.field}/${item.value}'`
            );
            if (params?.index.includes(':')) {
              state.setCcsWarning(true);
            }
            yield undefined;
          }
        }
      }

      let loadedHistograms = 0;
      for await (const item of fetchTransactionDurationHistograms()) {
        if (item !== undefined) {
          state.addValue(item);
        }
        loadedHistograms++;
        state.setProgress({
          loadedHistograms: loadedHistograms / fieldValuePairs.length,
        });
      }

      logMessage(
        `Identified ${
          state.getState().values.length
        } significant correlations out of ${
          fieldValuePairs.length
        } field/value pairs.`
      );
    } catch (e) {
      state.setError(e);
    }

    if (state.getState().error !== undefined && params?.index.includes(':')) {
      state.setCcsWarning(true);
    }

    state.setIsRunning(false);
  }

  fetchCorrelations();

  return () => {
    const {
      ccsWarning,
      error,
      isRunning,
      overallHistogram,
      percentileThresholdValue,
      progress,
    } = state.getState();

    return {
      ccsWarning,
      error,
      log,
      isRunning,
      loaded: Math.round(state.getOverallProgress() * 100),
      overallHistogram,
      started: progress.started,
      total: 100,
      values: state.getValuesSortedByCorrelation(),
      percentileThresholdValue,
      cancel,
    };
  };
};
