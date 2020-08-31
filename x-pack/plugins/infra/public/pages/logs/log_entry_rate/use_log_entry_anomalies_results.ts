/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState, useCallback, useEffect, useReducer } from 'react';
import { useMount } from 'react-use';
import { useTrackedPromise, CanceledPromiseError } from '../../../utils/use_tracked_promise';
import { callGetLogEntryAnomaliesAPI } from './service_calls/get_log_entry_anomalies';
import { callGetLogEntryAnomaliesDatasetsAPI } from './service_calls/get_log_entry_anomalies_datasets';
import {
  Sort,
  Pagination,
  PaginationCursor,
  GetLogEntryAnomaliesDatasetsSuccessResponsePayload,
  LogEntryAnomaly,
} from '../../../../common/http_api/log_analysis';

export type SortOptions = Sort;
export type PaginationOptions = Pick<Pagination, 'pageSize'>;
export type Page = number;
export type FetchNextPage = () => void;
export type FetchPreviousPage = () => void;
export type ChangeSortOptions = (sortOptions: Sort) => void;
export type ChangePaginationOptions = (paginationOptions: PaginationOptions) => void;
export type LogEntryAnomalies = LogEntryAnomaly[];
type LogEntryAnomaliesDatasets = GetLogEntryAnomaliesDatasetsSuccessResponsePayload['data']['datasets'];
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

export const useLogEntryAnomaliesResults = ({
  endTime,
  startTime,
  sourceId,
  defaultSortOptions,
  defaultPaginationOptions,
  onGetLogEntryAnomaliesDatasetsError,
  filteredDatasets,
}: {
  endTime: number;
  startTime: number;
  sourceId: string;
  defaultSortOptions: Sort;
  defaultPaginationOptions: Pick<Pagination, 'pageSize'>;
  onGetLogEntryAnomaliesDatasetsError?: (error: Error) => void;
  filteredDatasets?: string[];
}) => {
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

  const [logEntryAnomalies, setLogEntryAnomalies] = useState<LogEntryAnomalies>([]);

  const [getLogEntryAnomaliesRequest, getLogEntryAnomalies] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        const {
          timeRange: { start: queryStartTime, end: queryEndTime },
          sortOptions,
          paginationOptions,
          paginationCursor,
          filteredDatasets: queryFilteredDatasets,
        } = reducerState;
        return await callGetLogEntryAnomaliesAPI(
          sourceId,
          queryStartTime,
          queryEndTime,
          sortOptions,
          {
            ...paginationOptions,
            cursor: paginationCursor,
          },
          queryFilteredDatasets
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
        setLogEntryAnomalies(anomalies);
      },
    },
    [
      sourceId,
      dispatch,
      reducerState.timeRange,
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

  useEffect(() => {
    getLogEntryAnomalies();
  }, [getLogEntryAnomalies]);

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

  const isLoadingLogEntryAnomalies = useMemo(
    () => getLogEntryAnomaliesRequest.state === 'pending',
    [getLogEntryAnomaliesRequest.state]
  );

  const hasFailedLoadingLogEntryAnomalies = useMemo(
    () => getLogEntryAnomaliesRequest.state === 'rejected',
    [getLogEntryAnomaliesRequest.state]
  );

  // Anomalies datasets
  const [logEntryAnomaliesDatasets, setLogEntryAnomaliesDatasets] = useState<
    LogEntryAnomaliesDatasets
  >([]);

  const [getLogEntryAnomaliesDatasetsRequest, getLogEntryAnomaliesDatasets] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetLogEntryAnomaliesDatasetsAPI(sourceId, startTime, endTime);
      },
      onResolve: ({ data: { datasets } }) => {
        setLogEntryAnomaliesDatasets(datasets);
      },
      onReject: (error) => {
        if (
          error instanceof Error &&
          !(error instanceof CanceledPromiseError) &&
          onGetLogEntryAnomaliesDatasetsError
        ) {
          onGetLogEntryAnomaliesDatasetsError(error);
        }
      },
    },
    [endTime, sourceId, startTime]
  );

  const isLoadingDatasets = useMemo(() => getLogEntryAnomaliesDatasetsRequest.state === 'pending', [
    getLogEntryAnomaliesDatasetsRequest.state,
  ]);

  const hasFailedLoadingDatasets = useMemo(
    () => getLogEntryAnomaliesDatasetsRequest.state === 'rejected',
    [getLogEntryAnomaliesDatasetsRequest.state]
  );

  useMount(() => {
    getLogEntryAnomaliesDatasets();
  });

  return {
    logEntryAnomalies,
    getLogEntryAnomalies,
    isLoadingLogEntryAnomalies,
    isLoadingDatasets,
    hasFailedLoadingDatasets,
    datasets: logEntryAnomaliesDatasets,
    hasFailedLoadingLogEntryAnomalies,
    changeSortOptions,
    sortOptions: reducerState.sortOptions,
    changePaginationOptions,
    paginationOptions: reducerState.paginationOptions,
    fetchPreviousPage: reducerState.page > 1 ? handleFetchPreviousPage : undefined,
    fetchNextPage: reducerState.hasNextPage ? handleFetchNextPage : undefined,
    page: reducerState.page,
  };
};
