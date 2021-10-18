/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { of } from 'rxjs';
import { getOrElse } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';

import type { ElasticsearchClient } from 'src/core/server';

import type { ISearchStrategy } from '../../../../../../src/plugins/data/server';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../src/plugins/data/common';

import type {
  RawResponseBase,
  RawSearchStrategyClientParams,
  SearchStrategyClientParams,
} from '../../../common/search_strategies/types';
import type {
  LatencyCorrelationsParams,
  LatencyCorrelationsRawResponse,
} from '../../../common/search_strategies/latency_correlations/types';
import type {
  FailedTransactionsCorrelationsParams,
  FailedTransactionsCorrelationsRawResponse,
} from '../../../common/search_strategies/failed_transactions_correlations/types';
import { rangeRt } from '../../routes/default_api_types';
import type { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

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
  searchServiceProvider: SearchServiceProvider<
    FailedTransactionsCorrelationsParams & SearchStrategyClientParams,
    FailedTransactionsCorrelationsRawResponse & RawResponseBase
  >,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): ISearchStrategy<
  IKibanaSearchRequest<
    FailedTransactionsCorrelationsParams & RawSearchStrategyClientParams
  >,
  IKibanaSearchResponse<
    FailedTransactionsCorrelationsRawResponse & RawResponseBase
  >
>;

// Latency Correlations function overload
export function searchStrategyProvider(
  searchServiceProvider: SearchServiceProvider<
    LatencyCorrelationsParams & SearchStrategyClientParams,
    LatencyCorrelationsRawResponse & RawResponseBase
  >,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): ISearchStrategy<
  IKibanaSearchRequest<
    LatencyCorrelationsParams & RawSearchStrategyClientParams
  >,
  IKibanaSearchResponse<LatencyCorrelationsRawResponse & RawResponseBase>
>;

export function searchStrategyProvider<TRequestParams, TResponseParams>(
  searchServiceProvider: SearchServiceProvider<
    TRequestParams & SearchStrategyClientParams,
    TResponseParams & RawResponseBase
  >,
  getApmIndices: () => Promise<ApmIndicesConfig>,
  includeFrozen: boolean
): ISearchStrategy<
  IKibanaSearchRequest<TRequestParams & RawSearchStrategyClientParams>,
  IKibanaSearchResponse<TResponseParams & RawResponseBase>
> {
  const searchServiceMap = new Map<
    string,
    GetSearchServiceState<TResponseParams & RawResponseBase>
  >();

  return {
    search: (request, options, deps) => {
      if (request.params === undefined) {
        throw new Error('Invalid request parameters.');
      }

      const { start: startString, end: endString } = request.params;

      // converts string based start/end to epochmillis
      const decodedRange = pipe(
        rangeRt.decode({ start: startString, end: endString }),
        getOrElse<t.Errors, { start: number; end: number }>((errors) => {
          throw new Error(failure(errors).join('\n'));
        })
      );

      // The function to fetch the current state of the search service.
      // This will be either an existing service for a follow up fetch or a new one for new requests.
      let getSearchServiceState: GetSearchServiceState<
        TResponseParams & RawResponseBase
      >;

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
        const {
          start,
          end,
          environment,
          kuery,
          serviceName,
          transactionName,
          transactionType,
          ...requestParams
        } = request.params;

        getSearchServiceState = searchServiceProvider(
          deps.esClient.asCurrentUser,
          getApmIndices,
          {
            environment,
            kuery,
            serviceName,
            transactionName,
            transactionType,
            start: decodedRange.start,
            end: decodedRange.end,
            ...(requestParams as unknown as TRequestParams),
          },
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
