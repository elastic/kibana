/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';
import type { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';
import type { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { asyncSearchServiceLogProvider } from '../correlations/async_search_service_log';
import { asyncErrorCorrelationsSearchServiceStateProvider } from './async_search_service_state';
import { fetchTransactionDurationFieldCandidates } from '../correlations/queries';
import { SearchServiceFetchParams } from '../../../../common/search_strategies/correlations/types';
import { fetchErrorCorrelationPValues } from './queries/query_error_correlation';

export const asyncErrorCorrelationSearchServiceProvider = (
  esClient: ElasticsearchClient,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  searchServiceParams: SearchServiceParams,
  includeFrozen: boolean
) => {
  const { addLogMessage, getLogMessages } = asyncSearchServiceLogProvider();

  const state = asyncErrorCorrelationsSearchServiceStateProvider();

  async function fetchErrorCorrelations() {
    let params: SearchServiceFetchParams | undefined;

    try {
      const indices = await getApmIndices();
      params = {
        ...searchServiceParams,
        index: indices['apm_oss.transactionIndices'],
        includeFrozen,
      };

      // @TODO: double check criteria for error correlation candidates
      const { fieldCandidates } = await fetchTransactionDurationFieldCandidates(
        esClient,
        params
      );

      addLogMessage(`Identified ${fieldCandidates.length} fieldCandidates.`);

      state.setProgress({ loadedFieldCanditates: 1 });

      for (let i = 0; i < fieldCandidates.length; i++) {
        try {
          const results = await fetchErrorCorrelationPValues(
            esClient,
            params,
            fieldCandidates[i]
          );

          state.addValues(results.filter((r) => r?.p_value < 0.02));
        } catch (e) {
          state.setError(e);
        }
      }
    } catch (e) {
      state.setError(e);
    }

    state.setProgress({ loadedErrorCorrelations: 1 });

    if (state.getState().error !== undefined && params?.index.includes(':')) {
      state.setCcsWarning(true);
    }

    state.setIsRunning(false);
  }

  fetchErrorCorrelations();

  return () => {
    const { ccsWarning, error, isRunning, progress } = state.getState();

    return {
      ccsWarning,
      error,
      log: getLogMessages(),
      isRunning,
      loaded: Math.round(state.getOverallProgress() * 100),
      started: progress.started,
      total: 100,
      values: state.getValuesSortedByScore(),
      cancel: () => {
        addLogMessage(`Service cancelled.`);
        state.setIsCancelled(true);
      },
    };
  };
};
