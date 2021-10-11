/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { of } from 'rxjs';
import { chunk } from 'lodash';
import { fieldStatsSearchServiceStateProvider } from './field_stats_state_provider';
import { FieldStats, StartDeps } from '../types';
import { ISearchStrategy } from '../../../../../src/plugins/data/server';
import {
  FieldStatRawResponse,
  FieldStatsCommonRequestParams,
  FieldStatsRequest,
  FieldStatsResponse,
  FieldStatsSearchStrategyParams,
  isFieldStatsSearchStrategyParams,
} from '../../common/search_strategy/types';
import { getFieldStats } from './requests/get_field_stats';
import { buildBaseFilterCriteria, getSafeAggregationName } from '../../common/utils/query_utils';

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
  const searchServiceMap = new Map<string, GetSearchServiceState<FieldStatRawResponse>>();

  return {
    search: (request, options, deps) => {
      if (options.sessionId === undefined || request.params === undefined) {
        throw new Error('Invalid request parameters.');
      }

      // The function to fetch the current state of the search service.
      // This will be either an existing service for a follow up fetch or a new one for new requests.
      let getSearchServiceState: GetSearchServiceState<FieldStatRawResponse>;

      // If the request includes an ID, we require that the search service already exists
      // otherwise we throw an error. The client should never poll a service that's been cancelled or finished.
      // This also avoids instantiating search services when the service gets called with random IDs.
      const existingGetSearchServiceState = searchServiceMap.get(options.sessionId);

      if (typeof existingGetSearchServiceState === 'undefined') {
        getSearchServiceState = fieldStatsSearchServiceProvider(
          deps.esClient.asCurrentUser,
          request
        );
      } else {
        getSearchServiceState = existingGetSearchServiceState;
      }

      // Reuse the request's id or create a new one.
      const id = options.sessionId;

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
      const getSearchServiceState = searchServiceMap.get(id);
      if (getSearchServiceState !== undefined) {
        getSearchServiceState().cancel();
        searchServiceMap.delete(id);
      }
    },
  };
};

// @todo: remove
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const fieldStatsSearchServiceProvider = (
  esClient: ElasticsearchClient,
  request: FieldStatsRequest
) => {
  const state = fieldStatsSearchServiceStateProvider();

  async function fetchFieldStats() {
    try {
      if (isFieldStatsSearchStrategyParams(request.params)) {
        const searchStrategyParams = request.params;
        const fields = [
          ...searchStrategyParams.metricConfigs,
          ...searchStrategyParams.nonMetricConfigs,
        ];

        const filterCriteria = buildBaseFilterCriteria(
          searchStrategyParams.timeFieldName,
          searchStrategyParams.earliest,
          searchStrategyParams.latest,
          searchStrategyParams.searchQuery
        );

        const params: FieldStatsCommonRequestParams = {
          index: searchStrategyParams.index,
          samplerShardSize: searchStrategyParams.samplerShardSize,
          timeFieldName: searchStrategyParams.timeFieldName,
          earliestMs: searchStrategyParams.earliest,
          latestMs: searchStrategyParams.latest,
          runtimeFieldMap: searchStrategyParams.runtimeFieldMap,
          intervalMs: searchStrategyParams.intervalMs,
          query: {
            bool: {
              filter: filterCriteria,
            },
          },
        };

        const fieldToLoadCnt = fields.length;
        const fieldsWithError: any[] = [];
        let fieldsLoadedCnt = 0;

        if (params !== undefined && fields.length > 0) {
          const batches = chunk(fields, 10);
          for (let i = 0; i < batches.length; i++) {
            const batchedResults: FieldStats[] = [];

            try {
              const results = await Promise.allSettled([
                ...batches[i].map((field, idx) => {
                  return getFieldStats(esClient, params, {
                    fieldName: field.fieldName,
                    type: field.type,
                    cardinality: field.cardinality,
                    safeFieldName: getSafeAggregationName(field.fieldName ?? '', idx),
                  });
                }),
              ]);

              results.forEach((r, idx) => {
                if (r.status === 'fulfilled' && r.value !== undefined) {
                  batchedResults.push(r.value);
                } else {
                  if (r.status === 'rejected' && r.reason) {
                    const fieldWithError = batches[i][idx];
                    const reason = r.reason.meta.body.error?.reason ?? r.reason;
                    state.addErrorMessage(
                      `Error fetching field stats for ${fieldWithError.type} field ${fieldWithError.fieldName} because '${reason}'`
                    );
                  }
                }
              });

              state.addFieldsStats(batchedResults);
            } catch (e) {
              state.setError(e);
            }

            fieldsLoadedCnt += batches[i].length;
            state.setProgress({
              loadedFieldStats: fieldsLoadedCnt / fieldToLoadCnt,
            });
          }
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

  fetchFieldStats();

  return () => {
    const { ccsWarning, error, isRunning, fieldsStats, errorLog } = state.getState();
    return {
      cancel,
      error,
      meta: {
        loaded: state.getOverallProgress(),
        total: 1,
        isRunning,
        isPartial: isRunning,
      },
      // @todo
      rawResponse: {
        ccsWarning,
        log: [],
        took: 0,
        fieldStats: fieldsStats,
        errorLog,
      },
    };
  };
};
