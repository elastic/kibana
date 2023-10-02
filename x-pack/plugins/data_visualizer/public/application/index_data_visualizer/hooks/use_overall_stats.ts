/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef, useMemo, useReducer } from 'react';
import { from, Subscription, Observable } from 'rxjs';
import { mergeMap, last, map, toArray } from 'rxjs/operators';
import { chunk } from 'lodash';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '@kbn/data-plugin/common';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { useDataVisualizerKibana } from '../../kibana_context';
import {
  AggregatableFieldOverallStats,
  checkAggregatableFieldsExistRequest,
  checkNonAggregatableFieldExistsRequest,
  isAggregatableFieldOverallStats,
  isNonAggregatableFieldOverallStats,
  NonAggregatableFieldOverallStats,
  processAggregatableFieldsExistResponse,
  processNonAggregatableFieldsExistResponse,
} from '../search_strategy/requests/overall_stats';
import type { OverallStats } from '../types/overall_stats';
import { getDefaultPageState } from '../components/index_data_visualizer_view/index_data_visualizer_view';
import {
  DataStatsFetchProgress,
  isRandomSamplingOption,
  OverallStatsSearchStrategyParams,
} from '../../../../common/types/field_stats';
import { getDocumentCountStats } from '../search_strategy/requests/get_document_stats';
import { getInitialProgress, getReducer } from '../progress_utils';
import { MAX_CONCURRENT_REQUESTS } from '../constants/index_data_visualizer_viewer';
import { displayError } from '../../common/util/display_error';

/**
 * Helper function to run forkJoin
 * with restrictions on how many input observables can be subscribed to concurrently
 */
export function rateLimitingForkJoin<T>(
  observables: Array<Observable<T>>,
  maxConcurrentRequests = MAX_CONCURRENT_REQUESTS
): Observable<T[]> {
  return from(observables).pipe(
    mergeMap(
      (observable, index) =>
        observable.pipe(
          last(),
          map((value) => ({ index, value }))
        ),
      maxConcurrentRequests
    ),
    toArray(),
    map((indexedObservables) =>
      indexedObservables.sort((l, r) => l.index - r.index).map((obs) => obs.value)
    )
  );
}

export function useOverallStats<TParams extends OverallStatsSearchStrategyParams>(
  searchStrategyParams: TParams | undefined,
  lastRefresh: number,
  probability?: number | null
): {
  progress: DataStatsFetchProgress;
  overallStats: OverallStats;
} {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  const [stats, setOverallStats] = useState<OverallStats>(getDefaultPageState().overallStats);
  const [fetchState, setFetchState] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(async () => {
    try {
      searchSubscription$.current?.unsubscribe();
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();

      if (!searchStrategyParams || lastRefresh === 0) return;

      setFetchState({
        ...getInitialProgress(),
        isRunning: true,
        error: undefined,
      });

      const {
        aggregatableFields,
        nonAggregatableFields,
        index,
        searchQuery,
        timeFieldName,
        earliest,
        latest,
        runtimeFieldMap,
        samplingOption,
        sessionId,
        embeddableExecutionContext,
      } = searchStrategyParams;

      const searchOptions: ISearchOptions = {
        abortSignal: abortCtrl.current.signal,
        sessionId,
        ...(embeddableExecutionContext ? { executionContext: embeddableExecutionContext } : {}),
      };

      const documentCountStats = await getDocumentCountStats(
        data.search,
        searchStrategyParams,
        searchOptions,
        samplingOption.seed,
        probability
      );

      const nonAggregatableFieldsObs = nonAggregatableFields.map((fieldName: string) =>
        data.search
          .search<IKibanaSearchRequest, IKibanaSearchResponse>(
            {
              params: checkNonAggregatableFieldExistsRequest(
                index,
                searchQuery,
                fieldName,
                timeFieldName,
                earliest,
                latest,
                runtimeFieldMap
              ),
            },
            searchOptions
          )
          .pipe(
            map((resp) => {
              return {
                ...resp,
                rawResponse: { ...resp.rawResponse, fieldName },
              } as IKibanaSearchResponse;
            })
          )
      );

      // Have to divide into smaller requests to avoid 413 payload too large
      const aggregatableFieldsChunks = chunk(aggregatableFields, 30);

      if (isRandomSamplingOption(samplingOption)) {
        samplingOption.probability = documentCountStats.probability ?? 1;
      }
      const aggregatableOverallStatsObs = aggregatableFieldsChunks.map((aggregatableFieldsChunk) =>
        data.search
          .search(
            {
              params: checkAggregatableFieldsExistRequest(
                index,
                searchQuery,
                aggregatableFieldsChunk,
                samplingOption,
                timeFieldName,
                earliest,
                latest,
                undefined,
                runtimeFieldMap
              ),
            },
            searchOptions
          )
          .pipe(
            map((resp) => {
              return {
                ...resp,
                aggregatableFields: aggregatableFieldsChunk,
              } as AggregatableFieldOverallStats;
            })
          )
      );

      const sub = rateLimitingForkJoin<
        AggregatableFieldOverallStats | NonAggregatableFieldOverallStats | undefined
      >([...aggregatableOverallStatsObs, ...nonAggregatableFieldsObs], MAX_CONCURRENT_REQUESTS);

      searchSubscription$.current = sub.subscribe({
        next: (value) => {
          const aggregatableOverallStatsResp: AggregatableFieldOverallStats[] = [];
          const nonAggregatableOverallStatsResp: NonAggregatableFieldOverallStats[] = [];

          value.forEach((resp, idx) => {
            if (isAggregatableFieldOverallStats(resp)) {
              aggregatableOverallStatsResp.push(resp);
            }

            if (isNonAggregatableFieldOverallStats(resp)) {
              nonAggregatableOverallStatsResp.push(resp);
            }
          });

          const totalCount = documentCountStats?.totalCount ?? 0;

          const aggregatableOverallStats = processAggregatableFieldsExistResponse(
            aggregatableOverallStatsResp,
            aggregatableFields
          );

          const nonAggregatableOverallStats = processNonAggregatableFieldsExistResponse(
            nonAggregatableOverallStatsResp,
            nonAggregatableFields
          );

          setOverallStats({
            documentCountStats,
            ...nonAggregatableOverallStats,
            ...aggregatableOverallStats,
            totalCount,
          });
        },
        error: (error) => {
          displayError(toasts, searchStrategyParams.index, extractErrorProperties(error));
          setFetchState({
            isRunning: false,
            error,
          });
        },
        complete: () => {
          setFetchState({
            loaded: 100,
            isRunning: false,
          });
        },
      });
    } catch (error) {
      // An `AbortError` gets triggered when a user cancels a request by navigating away, we need to ignore these errors.
      if (error.name !== 'AbortError') {
        displayError(toasts, searchStrategyParams!.index, extractErrorProperties(error));
      }
    }
  }, [data.search, searchStrategyParams, toasts, lastRefresh, probability]);

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
  }, []);

  // auto-update
  useEffect(() => {
    startFetch();
  }, [startFetch]);

  useEffect(() => {
    return cancelFetch;
  }, [cancelFetch]);

  return useMemo(
    () => ({
      progress: fetchState,
      overallStats: stats,
    }),
    [stats, fetchState]
  );
}
