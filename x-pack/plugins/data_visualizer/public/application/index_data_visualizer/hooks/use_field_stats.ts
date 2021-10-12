/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Subscription } from 'rxjs';
import { chunk } from 'lodash';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import type {
  FieldStatRawResponse,
  FieldStatsSearchStrategyParams,
  FieldStatsSearchStrategyProgress,
  FieldStatsSearchStrategyReturnBase,
} from '../../../../common/search_strategy/types';
import { useDataVisualizerKibana } from '../../kibana_context';
import { FieldRequestConfig } from '../../../../common';
import { FIELD_STATS_SEARCH_STRATEGY } from '../../../../common/search_strategy/constants';
import { DataVisualizerIndexBasedAppState } from '../types/index_data_visualizer_state';

const getInitialRawResponse = (): FieldStatRawResponse =>
  ({
    ccsWarning: false,
    took: 0,
  } as FieldStatRawResponse);

const getInitialProgress = (): FieldStatsSearchStrategyProgress => ({
  isRunning: false,
  loaded: 0,
  total: 100,
});

const getReducer =
  <T>() =>
  (prev: T, update: Partial<T>): T => ({
    ...prev,
    ...update,
  });
interface FieldStatsParams {
  metricConfigs: FieldRequestConfig[];
  nonMetricConfigs: FieldRequestConfig[];
}

export function useFieldStatsSearchStrategy<TParams extends FieldStatsSearchStrategyParams>(
  searchStrategyParams: TParams | undefined,
  fieldStatsParams: FieldStatsParams | undefined,
  initialDataVisualizerListState: DataVisualizerIndexBasedAppState
): FieldStatsSearchStrategyReturnBase<FieldStatRawResponse> {
  const {
    services: { data },
  } = useDataVisualizerKibana();

  useEffect(
    () => console.log('initial dataVisualizerListState', initialDataVisualizerListState),
    [initialDataVisualizerListState]
  );

  const [rawResponse, setRawResponse] = useReducer(
    getReducer<FieldStatRawResponse>(),
    getInitialRawResponse()
  );

  const [fetchState, setFetchState] = useReducer(
    getReducer<FieldStatsSearchStrategyProgress>(),
    getInitialProgress()
  );

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    setFetchState({
      ...getInitialProgress(),
      error: undefined,
    });

    if (!searchStrategyParams || !fieldStatsParams) return;
    if (
      fieldStatsParams.metricConfigs.length === 0 &&
      fieldStatsParams.nonMetricConfigs.length === 0
    )
      return;

    const { sortField, sortDirection, pageSize } = initialDataVisualizerListState;
    /**
     * Sort the list of fields by the initial sort field and sort direction
     * Then divide into chunks by the initial page size
     */

    let sortedCnfigs = [
      ...fieldStatsParams.metricConfigs,
      ...fieldStatsParams.nonMetricConfigs,
    ].sort((a, b) => a[sortField].localeCompare(b[sortField]));
    if (sortDirection === 'desc') {
      sortedCnfigs = sortedCnfigs.reverse();
    }
    const chunks = chunk(sortedCnfigs, pageSize);
    console.log('chunks', chunks);
    const request = {
      params: { ...searchStrategyParams, ...fieldStatsParams },
    };
    // Submit the search request using the `data.search` service.
    searchSubscription$.current = data.search
      .search(request, {
        strategy: FIELD_STATS_SEARCH_STRATEGY,
        abortSignal: abortCtrl.current.signal,
        sessionId: searchStrategyParams?.sessionId,
      })
      .subscribe({
        next: (response) => {
          // Setting results to latest even if the response is still partial
          setRawResponse(response.rawResponse);

          setFetchState({
            isRunning: response.isRunning || false,
            ...(response.loaded ? { loaded: response.loaded } : {}),
            ...(response.total ? { total: response.total } : {}),
          });

          if (isCompleteResponse(response)) {
            // If the whole request is completed
            searchSubscription$.current?.unsubscribe();
            setFetchState({
              isRunning: false,
            });
          } else if (isErrorResponse(response)) {
            searchSubscription$.current?.unsubscribe();
            setFetchState({
              error: response as unknown as Error,
              isRunning: false,
            });
          }
        },
        error: (error: Error) => {
          setFetchState({
            error,
            isRunning: false,
          });
        },
      });
  }, [data.search, searchStrategyParams, fieldStatsParams, initialDataVisualizerListState]);

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
    setFetchState({
      isRunning: false,
    });
  }, []);

  // auto-update
  useEffect(() => {
    startFetch();
    return cancelFetch;
  }, [startFetch, cancelFetch]);

  return {
    progress: fetchState,
    response: rawResponse,
    startFetch,
    cancelFetch,
  };
}
