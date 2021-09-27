/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import uuid from 'uuid';
import { of } from 'rxjs';
import { fieldStatsSearchServiceStateProvider } from './field_stats_state_provider';
import { Field, StartDeps } from '../types';
import { ISearchStrategy } from '../../../../../src/plugins/data/server';
import {
  FieldStatRawResponse,
  FieldStatsRequest,
  FieldStatsResponse,
  FieldStatsSearchStrategyParams,
  isFieldStatsSearchStrategyParams,
} from '../../common/search_strategy/types';
import { ENHANCED_ES_SEARCH_STRATEGY } from '../../../../../src/plugins/data/common';
import { getFieldStats } from './requests/get_field_stats';

export interface RawResponseBase {
  ccsWarning: boolean;
  took: number;
}

export type FieldStatsRequestParams = FieldStatsSearchStrategyParams;

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

type GetSearchServiceState<TRawResponse extends FieldStatRawResponse> =
  () => SearchServiceState<TRawResponse>;

export type SearchServiceProvider<
  TSearchStrategyClientParams,
  TRawResponse extends RawResponseBase
> = (
  esClient: ElasticsearchClient,
  searchServiceParams: TSearchStrategyClientParams
) => GetSearchServiceState<FieldStatRawResponse>;

// @todo: rename
export const myEnhancedSearchStrategyProvider = (
  data: StartDeps['data']
): ISearchStrategy<FieldStatsRequest, FieldStatsResponse> => {
  // Get the default search strategy
  const ese = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
  const searchServiceMap = new Map<string, GetSearchServiceState<FieldStatRawResponse>>();

  return {
    search: (request, options, deps) => {
      if (request.params === undefined) {
        throw new Error('Invalid request parameters.');
      }

      // return formatResponse(ese.search(preprocessRequest(request.params), options, deps));

      // The function to fetch the current state of the search service.
      // This will be either an existing service for a follow up fetch or a new one for new requests.
      let getSearchServiceState: GetSearchServiceState<FieldStatRawResponse>;

      // If the request includes an ID, we require that the search service already exists
      // otherwise we throw an error. The client should never poll a service that's been cancelled or finished.
      // This also avoids instantiating search services when the service gets called with random IDs.
      if (typeof request.id === 'string') {
        const existingGetSearchServiceState = searchServiceMap.get(request.id);

        if (typeof existingGetSearchServiceState === 'undefined') {
          throw new Error(`SearchService with ID '${request.id}' does not exist.`);
        }

        getSearchServiceState = existingGetSearchServiceState;
      } else {
        getSearchServiceState = fieldStatsSearchServiceProvider(
          deps.esClient.asCurrentUser,
          request
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
      // search will be called multiple times,
      // be sure your response formatting is capable of handling partial results, as well as the final result.
      // return ese.search(request, options, deps);
    },
    cancel: async (id, options, deps) => {
      // call the cancel method of the async strategy you are using or implement your own cancellation function.
      if (ese.cancel) {
        await ese.cancel(id, options, deps);
      }
    },
  };
};

export const fieldStatsSearchServiceProvider = (
  esClient: ElasticsearchClient,
  request: FieldStatsRequest
) => {
  const state = fieldStatsSearchServiceStateProvider();

  async function fetchCorrelations() {
    try {
      if (isFieldStatsSearchStrategyParams(request.params)) {
        const params = request.params;
        const fields = [...params.metricConfigs, ...params.nonMetricConfigs];
        const fieldToLoadCnt = fields.length;
        let fieldsLoadedCnt = 0;

        for (let idx = 0; idx < fieldToLoadCnt; idx++) {
          const field = {
            fieldName: fields[idx].fieldName,
            type: fields[idx].type,
            cardinality: fields[idx].cardinality,
            identifier: idx,
          };

          try {
            const testMetricFieldResult = await getFieldStats(esClient, params, field, idx);
            state.addFieldStats(testMetricFieldResult);
          } catch (e) {
            console.error(e);
            // @todo: Log error
          }

          fieldsLoadedCnt += 1;
          state.setProgress({ loadedFieldStats: fieldsLoadedCnt / fieldToLoadCnt });
        }
      }
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
        fieldStats: state.getState().fieldsStats,
      },
    };
  };
};
