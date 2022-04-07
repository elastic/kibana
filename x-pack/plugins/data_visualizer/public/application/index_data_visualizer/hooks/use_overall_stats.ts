/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef, useMemo, useReducer } from 'react';
import { from, of, Subscription, Observable } from 'rxjs';
import { mergeMap, last, map, toArray } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import type { ToastsStart } from 'kibana/public';
import { chunk } from 'lodash';
import { useDataVisualizerKibana } from '../../kibana_context';
import {
  AggregatableFieldOverallStats,
  checkAggregatableFieldsExistRequest,
  checkNonAggregatableFieldExistsRequest,
  isAggregatableFieldOverallStats,
  processAggregatableFieldsExistResponse,
  processNonAggregatableFieldsExistResponse,
} from '../search_strategy/requests/overall_stats';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../../src/plugins/data/common';
import type { OverallStats } from '../types/overall_stats';
import { getDefaultPageState } from '../components/index_data_visualizer_view/index_data_visualizer_view';
import { extractErrorProperties } from '../utils/error_utils';
import type {
  DataStatsFetchProgress,
  OverallStatsSearchStrategyParams,
} from '../../../../common/types/field_stats';
import {
  getDocumentCountStatsRequest,
  processDocumentCountRandomStats,
  processDocumentCountStats,
} from '../search_strategy/requests/get_document_stats';
import { getInitialProgress, getReducer } from '../progress_utils';
import { MAX_CONCURRENT_REQUESTS } from '../constants/index_data_visualizer_viewer';

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

function displayError(toastNotifications: ToastsStart, index: string, err: any) {
  if (err.statusCode === 500) {
    toastNotifications.addError(err, {
      title: i18n.translate('xpack.dataVisualizer.index.dataLoader.internalServerErrorMessage', {
        defaultMessage:
          'Error loading data in index {index}. {message}. ' +
          'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
        values: {
          index,
          message: err.error ?? err.message,
        },
      }),
    });
  } else {
    toastNotifications.addError(err, {
      title: i18n.translate('xpack.dataVisualizer.index.errorLoadingDataMessage', {
        defaultMessage: 'Error loading data in index {index}. {message}.',
        values: {
          index,
          message: err.error ?? err.message,
        },
      }),
    });
  }
}

export function useOverallStats<TParams extends OverallStatsSearchStrategyParams>(
  searchStrategyParams: TParams | undefined,
  lastRefresh: number
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

  const startFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();

    if (!searchStrategyParams || lastRefresh === 0) return;

    setFetchState({
      ...getInitialProgress(),
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
      intervalMs,
      runtimeFieldMap,
      samplerShardSize,
      fieldsToFetch,
    } = searchStrategyParams;

    const searchOptions: ISearchOptions = {
      abortSignal: abortCtrl.current.signal,
      sessionId: searchStrategyParams?.sessionId,
    };

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

    const aggregatableOverallStatsObs = aggregatableFieldsChunks.map((aggregatableFieldsChunk) =>
      data.search
        .search(
          {
            params: checkAggregatableFieldsExistRequest(
              index,
              searchQuery,
              aggregatableFieldsChunk,
              samplerShardSize,
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
    const documentCountStats$ =
      !fieldsToFetch && timeFieldName !== undefined && intervalMs !== undefined && intervalMs > 0
        ? data.search.search(
            {
              params: getDocumentCountStatsRequest(searchStrategyParams),
            },
            searchOptions
          )
        : of(undefined);

    const sub = rateLimitingForkJoin<
      AggregatableFieldOverallStats | IKibanaSearchResponse | undefined
    >(
      [
        // documentCountStats$,
        // documentCountStatsRandom$,
        ...aggregatableOverallStatsObs,
        ...nonAggregatableFieldsObs,
      ],
      MAX_CONCURRENT_REQUESTS
    );

    searchSubscription$.current = sub.subscribe({
      next: (value) => {
        {
          const aggregatableOverallStatsResp: AggregatableFieldOverallStats[] = [];
          const nonAggregatableOverallStatsResp: IKibanaSearchResponse[] = [];
          // const documentCountStatsResp = value[0];
          // const documentCountStatsRandomResp = value[1];

          value.forEach((resp, idx) => {
            if (!resp) return;
            if (isAggregatableFieldOverallStats(resp)) {
              aggregatableOverallStatsResp.push(resp);
            } else {
              nonAggregatableOverallStatsResp.push(resp);
            }
          });

          const aggregatableOverallStats = processAggregatableFieldsExistResponse(
            aggregatableOverallStatsResp,
            aggregatableFields,
            samplerShardSize
          );

          const nonAggregatableOverallStats = processNonAggregatableFieldsExistResponse(
            nonAggregatableOverallStatsResp,
            nonAggregatableFields
          );

          setOverallStats({
            // documentCountStats: processDocumentCountStats(
            //   documentCountStatsResp?.rawResponse,
            //   searchStrategyParams
            // ),
            // documentCountStatsRandom: processDocumentCountRandomStats(
            //   documentCountStatsRandomResp?.rawResponse,
            //   searchStrategyParams
            // ),

            ...nonAggregatableOverallStats,
            ...aggregatableOverallStats,
          });
        }
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
  }, [data.search, searchStrategyParams, toasts, lastRefresh]);

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
  }, []);

  // auto-update
  useEffect(() => {
    startFetch();
    return cancelFetch;
  }, [startFetch, cancelFetch]);

  return useMemo(
    () => ({
      progress: fetchState,
      overallStats: stats,
    }),
    [stats, fetchState]
  );
}
