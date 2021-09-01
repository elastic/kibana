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
  LatencyCorrelationsAsyncSearchServiceProvider,
  LatencyCorrelationsSearchStrategy,
} from './latency_correlations';
import type {
  FailedTransactionsCorrelationsAsyncSearchServiceProvider,
  FailedTransactionsCorrelationsSearchStrategy,
} from './failed_transactions_correlations';

interface AsyncSearchServiceState<TRawResponse extends RawResponseBase> {
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

type GetAsyncSearchServiceState<
  TRawResponse extends RawResponseBase
> = () => AsyncSearchServiceState<TRawResponse>;

export type AsyncSearchServiceProvider<
  TSearchStrategyClientParams extends SearchStrategyClientParams,
  TRawResponse extends RawResponseBase
> = (
  esClient: ElasticsearchClient,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  searchServiceParams: TSearchStrategyClientParams,
  includeFrozen: boolean
) => GetAsyncSearchServiceState<TRawResponse>;

// Failed Transactions Correlations function overload
export function searchStrategyProvider(
  asyncSearchServiceProvider: FailedTransactionsCorrelationsAsyncSearchServiceProvider,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): FailedTransactionsCorrelationsSearchStrategy;

// Latency Correlations function overload
export function searchStrategyProvider(
  asyncSearchServiceProvider: LatencyCorrelationsAsyncSearchServiceProvider,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): LatencyCorrelationsSearchStrategy;

export function searchStrategyProvider<
  TSearchStrategyClientParams extends SearchStrategyClientParams,
  TRawResponse extends RawResponseBase
>(
  asyncSearchServiceProvider: AsyncSearchServiceProvider<
    TSearchStrategyClientParams,
    TRawResponse
  >,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): ISearchStrategy<
  IKibanaSearchRequest<TSearchStrategyClientParams>,
  IKibanaSearchResponse<TRawResponse>
> {
  const asyncSearchServiceMap = new Map<
    string,
    GetAsyncSearchServiceState<TRawResponse>
  >();

  return {
    search: (request, options, deps) => {
      if (request.params === undefined) {
        throw new Error('Invalid request parameters.');
      }

      // The function to fetch the current state of the async search service.
      // This will be either an existing service for a follow up fetch or a new one for new requests.
      let getAsyncSearchServiceState: GetAsyncSearchServiceState<TRawResponse>;

      // If the request includes an ID, we require that the async search service already exists
      // otherwise we throw an error. The client should never poll a service that's been cancelled or finished.
      // This also avoids instantiating async search services when the service gets called with random IDs.
      if (typeof request.id === 'string') {
        const existingGetAsyncSearchServiceState = asyncSearchServiceMap.get(
          request.id
        );

        if (typeof existingGetAsyncSearchServiceState === 'undefined') {
          throw new Error(
            `AsyncSearchService with ID '${request.id}' does not exist.`
          );
        }

        getAsyncSearchServiceState = existingGetAsyncSearchServiceState;
      } else {
        getAsyncSearchServiceState = asyncSearchServiceProvider(
          deps.esClient.asCurrentUser,
          getApmIndices,
          request.params as TSearchStrategyClientParams,
          includeFrozen
        );
      }

      // Reuse the request's id or create a new one.
      const id = request.id ?? uuid();

      const { error, meta, rawResponse } = getAsyncSearchServiceState();

      if (error instanceof Error) {
        asyncSearchServiceMap.delete(id);
        throw error;
      } else if (meta.isRunning) {
        asyncSearchServiceMap.set(id, getAsyncSearchServiceState);
      } else {
        asyncSearchServiceMap.delete(id);
      }

      return of({
        id,
        ...meta,
        rawResponse,
      });
    },
    cancel: async (id, options, deps) => {
      const getAsyncSearchServiceState = asyncSearchServiceMap.get(id);
      if (getAsyncSearchServiceState !== undefined) {
        getAsyncSearchServiceState().cancel();
        asyncSearchServiceMap.delete(id);
      }
    },
  };
}
