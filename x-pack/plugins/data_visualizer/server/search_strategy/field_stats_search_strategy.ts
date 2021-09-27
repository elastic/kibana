/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { fieldStatsSearchServiceStateProvider } from './field_stats_state_provider';

export interface RawResponseBase {
  ccsWarning: boolean;
  took: number;
}

export interface FieldStatsRequestParams {
  sessionId?: string;
}

export interface SearchStrategyServerParams {
  includeFrozen?: boolean;
}

export interface FieldStatsRawResponse extends RawResponseBase {
  log: string[];
}

interface SearchServiceState<TRawResponse extends RawResponseBase> {
  cancel: () => void;
  error: Error;
  meta: {
    loaded: number;
    total: number;
    isRunning: boolean;
    isPartial: boolean;
  };
  rawResponse: TRawResponse;
}

type GetSearchServiceState<TRawResponse extends RawResponseBase> =
  () => SearchServiceState<TRawResponse>;

export type SearchServiceProvider<
  TSearchStrategyClientParams,
  TRawResponse extends RawResponseBase
> = (
  esClient: ElasticsearchClient,
  searchServiceParams: TSearchStrategyClientParams,
  includeFrozen: boolean
) => GetSearchServiceState<TRawResponse>;

export type FieldStatsSearchServiceProvider = SearchServiceProvider<
  FieldStatsRequestParams,
  FieldStatsRawResponse
>;

export const fieldStatsSearchServiceProvider: FieldStatsSearchServiceProvider = (
  esClient: ElasticsearchClient,
  searchServiceParams: FieldStatsRequestParams,
  includeFrozen: boolean
) => {
  const state = fieldStatsSearchServiceStateProvider();

  async function fetchCorrelations() {
    let params: (FieldStatsRequestParams & SearchStrategyServerParams) | undefined;

    try {
      params = {
        ...searchServiceParams,
        includeFrozen,
      };
    } catch (e) {
      state.setError(e);
    }

    if (state.getState().error !== undefined) {
      state.setCcsWarning(true);
    }

    state.setIsRunning(false);
  }

  function cancel() {
    // addLogMessage(`Service cancelled.`);
    state.setIsCancelled(true);
  }

  fetchCorrelations();

  return () => {
    const { ccsWarning, error, isRunning } = state.getState();

    return {
      cancel,
      error,
      meta: {
        loaded: Math.round(state.getOverallProgress() * 100),
        total: 100,
        isRunning,
        isPartial: isRunning,
      },
      // @todo
      rawResponse: {
        ccsWarning,
        log: [],
        took: 0,
      },
    };
  };
};
