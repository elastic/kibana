/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState, useCallback, useEffect, useReducer } from 'react';
import { HttpHandler } from '@kbn/core/public';
import {
  Sort,
  Pagination,
  PaginationCursor,
  INFA_ML_GET_METRICS_K8S_ANOMALIES_PATH,
  getMetricsK8sAnomaliesSuccessReponsePayloadRT,
  getMetricsK8sAnomaliesRequestPayloadRT,
  MetricsK8sAnomaly,
  Metric,
} from '../../../../../common/http_api/infra_ml';
import { useTrackedPromise } from '../../../../utils/use_tracked_promise';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

export type SortOptions = Sort;
export type PaginationOptions = Pick<Pagination, 'pageSize'>;
export type Page = number;
export type FetchNextPage = () => void;
export type FetchPreviousPage = () => void;
export type ChangeSortOptions = (sortOptions: Sort) => void;
export type ChangePaginationOptions = (paginationOptions: PaginationOptions) => void;
export type MetricsK8sAnomalies = MetricsK8sAnomaly[];
interface PaginationCursors {
  previousPageCursor: PaginationCursor;
  nextPageCursor: PaginationCursor;
}

interface ReducerState {
  page: number;
  lastReceivedCursors: PaginationCursors | undefined;
  paginationCursor: Pagination['cursor'] | undefined;
  hasNextPage: boolean;
  paginationOptions: PaginationOptions;
  sortOptions: Sort;
  timeRange: {
    start: number;
    end: number;
  };
  filteredDatasets?: string[];
}

type ReducerStateDefaults = Pick<
  ReducerState,
  'page' | 'lastReceivedCursors' | 'paginationCursor' | 'hasNextPage'
>;

type ReducerAction =
  | { type: 'changePaginationOptions'; payload: { paginationOptions: PaginationOptions } }
  | { type: 'changeSortOptions'; payload: { sortOptions: Sort } }
  | { type: 'fetchNextPage' }
  | { type: 'fetchPreviousPage' }
  | { type: 'changeHasNextPage'; payload: { hasNextPage: boolean } }
  | { type: 'changeLastReceivedCursors'; payload: { lastReceivedCursors: PaginationCursors } }
  | { type: 'changeTimeRange'; payload: { timeRange: { start: number; end: number } } }
  | { type: 'changeFilteredDatasets'; payload: { filteredDatasets?: string[] } };

const stateReducer = (state: ReducerState, action: ReducerAction): ReducerState => {
  const resetPagination = {
    page: 1,
    paginationCursor: undefined,
  };
  switch (action.type) {
    case 'changePaginationOptions':
      return {
        ...state,
        ...resetPagination,
        ...action.payload,
      };
    case 'changeSortOptions':
      return {
        ...state,
        ...resetPagination,
        ...action.payload,
      };
    case 'changeHasNextPage':
      return {
        ...state,
        ...action.payload,
      };
    case 'changeLastReceivedCursors':
      return {
        ...state,
        ...action.payload,
      };
    case 'fetchNextPage':
      return state.lastReceivedCursors
        ? {
            ...state,
            page: state.page + 1,
            paginationCursor: { searchAfter: state.lastReceivedCursors.nextPageCursor },
          }
        : state;
    case 'fetchPreviousPage':
      return state.lastReceivedCursors
        ? {
            ...state,
            page: state.page - 1,
            paginationCursor: { searchBefore: state.lastReceivedCursors.previousPageCursor },
          }
        : state;
    case 'changeTimeRange':
      return {
        ...state,
        ...resetPagination,
        ...action.payload,
      };
    case 'changeFilteredDatasets':
      return {
        ...state,
        ...resetPagination,
        ...action.payload,
      };
    default:
      return state;
  }
};

const STATE_DEFAULTS: ReducerStateDefaults = {
  // NOTE: This piece of state is purely for the client side, it could be extracted out of the hook.
  page: 1,
  // Cursor from the last request
  lastReceivedCursors: undefined,
  // Cursor to use for the next request. For the first request, and therefore not paging, this will be undefined.
  paginationCursor: undefined,
  hasNextPage: false,
};

export const useMetricsK8sAnomaliesResults = ({
  endTime,
  startTime,
  sourceId,
  anomalyThreshold,
  defaultSortOptions,
  defaultPaginationOptions,
  onGetMetricsHostsAnomaliesDatasetsError,
  filteredDatasets,
}: {
  endTime: number;
  startTime: number;
  sourceId: string;
  anomalyThreshold: number;
  defaultSortOptions: Sort;
  defaultPaginationOptions: Pick<Pagination, 'pageSize'>;
  onGetMetricsHostsAnomaliesDatasetsError?: (error: Error) => void;
  filteredDatasets?: string[];
}) => {
  const { services } = useKibanaContextForPlugin();
  const initStateReducer = (stateDefaults: ReducerStateDefaults): ReducerState => {
    return {
      ...stateDefaults,
      paginationOptions: defaultPaginationOptions,
      sortOptions: defaultSortOptions,
      filteredDatasets,
      timeRange: {
        start: startTime,
        end: endTime,
      },
    };
  };

  const [reducerState, dispatch] = useReducer(stateReducer, STATE_DEFAULTS, initStateReducer);

  const [metricsK8sAnomalies, setMetricsK8sAnomalies] = useState<MetricsK8sAnomalies>([]);

  const [getMetricsK8sAnomaliesRequest, getMetricsK8sAnomalies] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async (metric?: Metric, query?: string) => {
        const {
          timeRange: { start: queryStartTime, end: queryEndTime },
          sortOptions,
          paginationOptions,
          paginationCursor,
        } = reducerState;
        return await callGetMetricsK8sAnomaliesAPI(
          {
            sourceId,
            anomalyThreshold,
            startTime: queryStartTime,
            endTime: queryEndTime,
            metric,
            query,
            sort: sortOptions,
            pagination: {
              ...paginationOptions,
              cursor: paginationCursor,
            },
          },
          services.http.fetch
        );
      },
      onResolve: ({ data: { anomalies, paginationCursors: requestCursors, hasMoreEntries } }) => {
        const { paginationCursor } = reducerState;
        if (requestCursors) {
          dispatch({
            type: 'changeLastReceivedCursors',
            payload: { lastReceivedCursors: requestCursors },
          });
        }
        // Check if we have more "next" entries. "Page" covers the "previous" scenario,
        // since we need to know the page we're on anyway.
        if (!paginationCursor || (paginationCursor && 'searchAfter' in paginationCursor)) {
          dispatch({ type: 'changeHasNextPage', payload: { hasNextPage: hasMoreEntries } });
        } else if (paginationCursor && 'searchBefore' in paginationCursor) {
          // We've requested a previous page, therefore there is a next page.
          dispatch({ type: 'changeHasNextPage', payload: { hasNextPage: true } });
        }
        setMetricsK8sAnomalies(anomalies);
      },
    },
    [
      sourceId,
      anomalyThreshold,
      dispatch,
      reducerState.timeRange.start,
      reducerState.timeRange.end,
      reducerState.sortOptions,
      reducerState.paginationOptions,
      reducerState.paginationCursor,
      reducerState.filteredDatasets,
    ]
  );

  const changeSortOptions = useCallback(
    (nextSortOptions: Sort) => {
      dispatch({ type: 'changeSortOptions', payload: { sortOptions: nextSortOptions } });
    },
    [dispatch]
  );

  const changePaginationOptions = useCallback(
    (nextPaginationOptions: PaginationOptions) => {
      dispatch({
        type: 'changePaginationOptions',
        payload: { paginationOptions: nextPaginationOptions },
      });
    },
    [dispatch]
  );

  // Time range has changed
  useEffect(() => {
    dispatch({
      type: 'changeTimeRange',
      payload: { timeRange: { start: startTime, end: endTime } },
    });
  }, [startTime, endTime]);

  // Selected datasets have changed
  useEffect(() => {
    dispatch({
      type: 'changeFilteredDatasets',
      payload: { filteredDatasets },
    });
  }, [filteredDatasets]);

  const handleFetchNextPage = useCallback(() => {
    if (reducerState.lastReceivedCursors) {
      dispatch({ type: 'fetchNextPage' });
    }
  }, [dispatch, reducerState]);

  const handleFetchPreviousPage = useCallback(() => {
    if (reducerState.lastReceivedCursors) {
      dispatch({ type: 'fetchPreviousPage' });
    }
  }, [dispatch, reducerState]);

  const isLoadingMetricsK8sAnomalies = useMemo(
    () => getMetricsK8sAnomaliesRequest.state === 'pending',
    [getMetricsK8sAnomaliesRequest.state]
  );

  const hasFailedLoadingMetricsK8sAnomalies = useMemo(
    () => getMetricsK8sAnomaliesRequest.state === 'rejected',
    [getMetricsK8sAnomaliesRequest.state]
  );

  return {
    metricsK8sAnomalies,
    getMetricsK8sAnomalies,
    isLoadingMetricsK8sAnomalies,
    hasFailedLoadingMetricsK8sAnomalies,
    changeSortOptions,
    sortOptions: reducerState.sortOptions,
    changePaginationOptions,
    paginationOptions: reducerState.paginationOptions,
    fetchPreviousPage: reducerState.page > 1 ? handleFetchPreviousPage : undefined,
    fetchNextPage: reducerState.hasNextPage ? handleFetchNextPage : undefined,
    page: reducerState.page,
  };
};

interface RequestArgs {
  sourceId: string;
  anomalyThreshold: number;
  startTime: number;
  endTime: number;
  metric?: Metric;
  query?: string;
  sort: Sort;
  pagination: Pagination;
}

export const callGetMetricsK8sAnomaliesAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpHandler
) => {
  const { sourceId, anomalyThreshold, startTime, endTime, metric, query, sort, pagination } =
    requestArgs;
  const response = await fetch(INFA_ML_GET_METRICS_K8S_ANOMALIES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getMetricsK8sAnomaliesRequestPayloadRT.encode({
        data: {
          sourceId,
          anomalyThreshold,
          timeRange: {
            startTime,
            endTime,
          },
          metric,
          query,
          sort,
          pagination,
        },
      })
    ),
  });

  return decodeOrThrow(getMetricsK8sAnomaliesSuccessReponsePayloadRT)(response);
};
