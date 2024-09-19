/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { of } from 'rxjs';

import type { ElasticsearchClient } from 'src/core/server';

import type { ISearchStrategy } from '../../../../../../src/plugins/data/server';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../src/plugins/data/common';

import type { SearchStrategyClientParams } from '../../../common/search_strategies/types';
import type { RawResponseBase } from '../../../common/search_strategies/types';
import type { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

import type {
  LatencyCorrelationsSearchServiceProvider,
  LatencyCorrelationsSearchStrategy,
} from './latency_correlations';
import type {
  FailedTransactionsCorrelationsSearchServiceProvider,
  FailedTransactionsCorrelationsSearchStrategy,
} from './failed_transactions_correlations';

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
  TSearchStrategyClientParams extends SearchStrategyClientParams,
  TRawResponse extends RawResponseBase
> = (
  esClient: ElasticsearchClient,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  searchServiceParams: TSearchStrategyClientParams,
  includeFrozen: boolean
) => GetSearchServiceState<TRawResponse>;

// Failed Transactions Correlations function overload
export function searchStrategyProvider(
  searchServiceProvider: FailedTransactionsCorrelationsSearchServiceProvider,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): FailedTransactionsCorrelationsSearchStrategy;

// Latency Correlations function overload
export function searchStrategyProvider(
  searchServiceProvider: LatencyCorrelationsSearchServiceProvider,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): LatencyCorrelationsSearchStrategy;

export function searchStrategyProvider<
  TSearchStrategyClientParams extends SearchStrategyClientParams,
  TRawResponse extends RawResponseBase
>(
  searchServiceProvider: SearchServiceProvider<
    TSearchStrategyClientParams,
    TRawResponse
  >,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): ISearchStrategy<
  IKibanaSearchRequest<TSearchStrategyClientParams>,
  IKibanaSearchResponse<TRawResponse>
> {
  const searchServiceMap = new Map<
    string,
    GetSearchServiceState<TRawResponse>
  >();

  return {
    search: (request, options, deps) => {
      if (request.params === undefined) {
        throw new Error('Invalid request parameters.');
      }

      // The function to fetch the current state of the search service.
      // This will be either an existing service for a follow up fetch or a new one for new requests.
      let getSearchServiceState: GetSearchServiceState<TRawResponse>;

      // If the request includes an ID, we require that the search service already exists
      // otherwise we throw an error. The client should never poll a service that's been cancelled or finished.
      // This also avoids instantiating search services when the service gets called with random IDs.
      if (typeof request.id === 'string') {
        const existingGetSearchServiceState = searchServiceMap.get(request.id);

        if (typeof existingGetSearchServiceState === 'undefined') {
          throw new Error(
            `SearchService with ID '${request.id}' does not exist.`
          );
        }

        getSearchServiceState = existingGetSearchServiceState;
      } else {
        getSearchServiceState = searchServiceProvider(
          deps.esClient.asCurrentUser,
          getApmIndices,
          request.params as TSearchStrategyClientParams,
          includeFrozen
        );
      }

      // Reuse the request's id or create a new one.
      const id = request.id ?? uuid();

      const { error, meta, rawResponse } = getSearchServiceState();

      if (error instanceof Error) {
        searchServiceMap.delete(id);
        throw error;
      } else if (meta.isRunning) {
        searchServiceMap.set(id, getSearchServiceState);
      } else {
        searchServiceMap.delete(id);
      }

      return of({
        id,
        ...meta,
        rawResponse,
      });
    },
    cancel: async (id, options, deps) => {
      const getSearchServiceState = searchServiceMap.get(id);
      if (getSearchServiceState !== undefined) {
        getSearchServiceState().cancel();
        searchServiceMap.delete(id);
      }
    },
  };
}
