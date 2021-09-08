/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type { ElasticsearchClient } from 'src/core/server';

import type { ISearchStrategy } from '../../../../../../../src/plugins/data/server';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../../src/plugins/data/common';

import { EVENT_OUTCOME } from '../../../../common/elasticsearch_fieldnames';
import type { SearchStrategyParams } from '../../../../common/search_strategies/types';
import type {
  FailedTransactionsCorrelationsParams,
  FailedTransactionsCorrelationsRawResponse,
} from '../../../../common/search_strategies/failed_transactions_correlations/types';
import type { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { searchServiceLogProvider } from '../search_service_log';
import {
  fetchFailedTransactionsCorrelationPValues,
  fetchTransactionDurationFieldCandidates,
} from '../queries';
import type { SearchServiceProvider } from '../search_strategy_provider';

import { failedTransactionsCorrelationsSearchServiceStateProvider } from './failed_transactions_correlations_search_service_state';

import { ERROR_CORRELATION_THRESHOLD } from '../constants';

export type FailedTransactionsCorrelationsSearchServiceProvider = SearchServiceProvider<
  FailedTransactionsCorrelationsParams,
  FailedTransactionsCorrelationsRawResponse
>;

export type FailedTransactionsCorrelationsSearchStrategy = ISearchStrategy<
  IKibanaSearchRequest<FailedTransactionsCorrelationsParams>,
  IKibanaSearchResponse<FailedTransactionsCorrelationsRawResponse>
>;

export const failedTransactionsCorrelationsSearchServiceProvider: FailedTransactionsCorrelationsSearchServiceProvider = (
  esClient: ElasticsearchClient,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  searchServiceParams: FailedTransactionsCorrelationsParams,
  includeFrozen: boolean
) => {
  const { addLogMessage, getLogMessages } = searchServiceLogProvider();

  const state = failedTransactionsCorrelationsSearchServiceStateProvider();

  async function fetchErrorCorrelations() {
    try {
      const indices = await getApmIndices();
      const params: SearchStrategyParams = {
        ...searchServiceParams,
        index: indices['apm_oss.transactionIndices'],
        includeFrozen,
      };

      const {
        fieldCandidates: candidates,
      } = await fetchTransactionDurationFieldCandidates(esClient, params);

      const fieldCandidates = candidates.filter((t) => !(t === EVENT_OUTCOME));

      addLogMessage(`Identified ${fieldCandidates.length} fieldCandidates.`);

      state.setProgress({ loadedFieldCandidates: 1 });

      let fieldCandidatesFetchedCount = 0;
      if (params !== undefined && fieldCandidates.length > 0) {
        const batches = chunk(fieldCandidates, 10);
        for (let i = 0; i < batches.length; i++) {
          try {
            const results = await Promise.allSettled(
              batches[i].map((fieldName) =>
                fetchFailedTransactionsCorrelationPValues(
                  esClient,
                  params,
                  fieldName
                )
              )
            );

            results.forEach((result, idx) => {
              if (result.status === 'fulfilled') {
                state.addFailedTransactionsCorrelations(
                  result.value.filter(
                    (record) =>
                      record &&
                      typeof record.pValue === 'number' &&
                      record.pValue < ERROR_CORRELATION_THRESHOLD
                  )
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
    const { ccsWarning, error, isRunning, progress } = state.getState();

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
        failedTransactionsCorrelations: state.getFailedTransactionsCorrelationsSortedByScore(),
      },
    };
  };
};
