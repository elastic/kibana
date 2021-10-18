/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type { ElasticsearchClient } from 'src/core/server';

import { EVENT_OUTCOME } from '../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../common/event_outcome';
import type {
  SearchStrategyClientParams,
  SearchStrategyServerParams,
  RawResponseBase,
} from '../../../../common/search_strategies/types';
import type {
  FailedTransactionsCorrelationsParams,
  FailedTransactionsCorrelationsRawResponse,
} from '../../../../common/search_strategies/failed_transactions_correlations/types';
import type { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { searchServiceLogProvider } from '../search_service_log';
import {
  fetchFailedTransactionsCorrelationPValues,
  fetchTransactionDurationFieldCandidates,
  fetchTransactionDurationPercentiles,
  fetchTransactionDurationRanges,
  fetchTransactionDurationHistogramRangeSteps,
} from '../queries';
import type { SearchServiceProvider } from '../search_strategy_provider';

import { failedTransactionsCorrelationsSearchServiceStateProvider } from './failed_transactions_correlations_search_service_state';

import { ERROR_CORRELATION_THRESHOLD } from '../constants';
import { fetchFieldsStats } from '../queries/field_stats/get_fields_stats';

type FailedTransactionsCorrelationsSearchServiceProvider =
  SearchServiceProvider<
    FailedTransactionsCorrelationsParams & SearchStrategyClientParams,
    FailedTransactionsCorrelationsRawResponse & RawResponseBase
  >;

export const failedTransactionsCorrelationsSearchServiceProvider: FailedTransactionsCorrelationsSearchServiceProvider =
  (
    esClient: ElasticsearchClient,
    getApmIndices: () => Promise<ApmIndicesConfig>,
    searchServiceParams: FailedTransactionsCorrelationsParams &
      SearchStrategyClientParams,
    includeFrozen: boolean
  ) => {
    const { addLogMessage, getLogMessages } = searchServiceLogProvider();

    const state = failedTransactionsCorrelationsSearchServiceStateProvider();

    async function fetchErrorCorrelations() {
      try {
        const indices = await getApmIndices();
        const params: FailedTransactionsCorrelationsParams &
          SearchStrategyClientParams &
          SearchStrategyServerParams = {
          ...searchServiceParams,
          index: indices.transaction,
          includeFrozen,
        };

        // 95th percentile to be displayed as a marker in the log log chart
        const { totalDocs, percentiles: percentilesResponseThresholds } =
          await fetchTransactionDurationPercentiles(
            esClient,
            params,
            params.percentileThreshold
              ? [params.percentileThreshold]
              : undefined
          );
        const percentileThresholdValue =
          percentilesResponseThresholds[`${params.percentileThreshold}.0`];
        state.setPercentileThresholdValue(percentileThresholdValue);

        addLogMessage(
          `Fetched ${params.percentileThreshold}th percentile value of ${percentileThresholdValue} based on ${totalDocs} documents.`
        );

        // finish early if we weren't able to identify the percentileThresholdValue.
        if (percentileThresholdValue === undefined) {
          addLogMessage(
            `Abort service since percentileThresholdValue could not be determined.`
          );
          state.setProgress({
            loadedFieldCandidates: 1,
            loadedErrorCorrelations: 1,
            loadedOverallHistogram: 1,
            loadedFailedTransactionsCorrelations: 1,
          });
          state.setIsRunning(false);
          return;
        }

        const histogramRangeSteps =
          await fetchTransactionDurationHistogramRangeSteps(esClient, params);

        const overallLogHistogramChartData =
          await fetchTransactionDurationRanges(
            esClient,
            params,
            histogramRangeSteps
          );
        const errorLogHistogramChartData = await fetchTransactionDurationRanges(
          esClient,
          params,
          histogramRangeSteps,
          [{ fieldName: EVENT_OUTCOME, fieldValue: EventOutcome.failure }]
        );

        state.setProgress({ loadedOverallHistogram: 1 });
        state.setErrorHistogram(errorLogHistogramChartData);
        state.setOverallHistogram(overallLogHistogramChartData);

        const { fieldCandidates: candidates } =
          await fetchTransactionDurationFieldCandidates(esClient, params);

        const fieldCandidates = candidates.filter(
          (t) => !(t === EVENT_OUTCOME)
        );

        addLogMessage(`Identified ${fieldCandidates.length} fieldCandidates.`);

        state.setProgress({ loadedFieldCandidates: 1 });

        let fieldCandidatesFetchedCount = 0;
        const fieldsToSample = new Set<string>();
        if (params !== undefined && fieldCandidates.length > 0) {
          const batches = chunk(fieldCandidates, 10);
          for (let i = 0; i < batches.length; i++) {
            try {
              const results = await Promise.allSettled(
                batches[i].map((fieldName) =>
                  fetchFailedTransactionsCorrelationPValues(
                    esClient,
                    params,
                    histogramRangeSteps,
                    fieldName
                  )
                )
              );

              results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                  const significantCorrelations = result.value.filter(
                    (record) =>
                      record &&
                      record.pValue !== undefined &&
                      record.pValue < ERROR_CORRELATION_THRESHOLD
                  );

                  significantCorrelations.forEach((r) => {
                    fieldsToSample.add(r.fieldName);
                  });

                  state.addFailedTransactionsCorrelations(
                    significantCorrelations
                  );
                } else {
                  // If one of the fields in the batch had an error
                  addLogMessage(
                    `Error getting error correlation for field ${batches[i][idx]}: ${result.reason}.`
                  );
                }
              });
            } catch (e) {
              state.setError(e);

              if (params?.index.includes(':')) {
                state.setCcsWarning(true);
              }
            } finally {
              fieldCandidatesFetchedCount += batches[i].length;
              state.setProgress({
                loadedFailedTransactionsCorrelations:
                  fieldCandidatesFetchedCount / fieldCandidates.length,
              });
            }
          }

          addLogMessage(
            `Identified correlations for ${fieldCandidatesFetchedCount} fields out of ${fieldCandidates.length} candidates.`
          );
        }

        addLogMessage(
          `Identified ${fieldsToSample.size} fields to sample for field statistics.`
        );

        const { stats: fieldStats } = await fetchFieldsStats(
          esClient,
          params,
          [...fieldsToSample],
          [{ fieldName: EVENT_OUTCOME, fieldValue: EventOutcome.failure }]
        );

        addLogMessage(
          `Retrieved field statistics for ${fieldStats.length} fields out of ${fieldsToSample.size} fields.`
        );

        state.addFieldStats(fieldStats);
      } catch (e) {
        state.setError(e);
      }

      addLogMessage(
        `Identified ${
          state.getState().failedTransactionsCorrelations.length
        } significant correlations relating to failed transactions.`
      );

      state.setIsRunning(false);
    }

    fetchErrorCorrelations();

    return () => {
      const {
        ccsWarning,
        error,
        isRunning,
        overallHistogram,
        errorHistogram,
        percentileThresholdValue,
        progress,
        fieldStats,
      } = state.getState();

      return {
        cancel: () => {
          addLogMessage(`Service cancelled.`);
          state.setIsCancelled(true);
        },
        error,
        meta: {
          loaded: Math.round(state.getOverallProgress() * 100),
          total: 100,
          isRunning,
          isPartial: isRunning,
        },
        rawResponse: {
          ccsWarning,
          log: getLogMessages(),
          took: Date.now() - progress.started,
          failedTransactionsCorrelations:
            state.getFailedTransactionsCorrelationsSortedByScore(),
          overallHistogram,
          errorHistogram,
          percentileThresholdValue,
          fieldStats,
        },
      };
    };
  };
