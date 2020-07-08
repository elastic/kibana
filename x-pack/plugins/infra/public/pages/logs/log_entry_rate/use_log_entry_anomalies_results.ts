/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
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

export const useLogEntryAnomaliesResults = ({
  endTime,
  startTime,
  sourceId,
  lastChangedTime,
  defaultSortOptions,
  defaultPaginationOptions,
  onGetLogEntryAnomaliesDatasetsError,
  filteredDatasets,
}: {
  endTime: number;
  startTime: number;
  sourceId: string;
  lastChangedTime: number;
  defaultSortOptions: Sort;
  defaultPaginationOptions: Pick<Pagination, 'pageSize'>;
  onGetLogEntryAnomaliesDatasetsError?: (error: Error) => void;
  filteredDatasets?: string[];
}) => {
  // Pagination
  const [page, setPage] = useState(1);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>(
    defaultPaginationOptions
  );
  // Cursor from the last request
  const [lastReceivedCursors, setLastReceivedCursors] = useState<PaginationCursors | undefined>();
  // Cursor to use for the next request. For the first request, and therefore not paging, this will be undefined.
  const [paginationCursor, setPaginationCursor] = useState<Pagination['cursor'] | undefined>(
    undefined
  );
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Sort
  const [sortOptions, setSortOptions] = useState<Sort>(defaultSortOptions);

  const resetPagination = useCallback(() => {
    setPage(1);
    setPaginationCursor(undefined);
  }, [setPage, setPaginationCursor]);

  const [logEntryAnomalies, setLogEntryAnomalies] = useState<LogEntryAnomalies>([]);

  const [getLogEntryAnomaliesRequest, getLogEntryAnomalies] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetLogEntryAnomaliesAPI(
          sourceId,
          startTime,
          endTime,
          sortOptions,
          {
            ...paginationOptions,
            cursor: paginationCursor,
          },
          filteredDatasets
        );
      },
      onResolve: ({ data: { anomalies, paginationCursors: requestCursors, hasMoreEntries } }) => {
        if (requestCursors) {
          setLastReceivedCursors(requestCursors);
        }
        // Check if we have more "next" entries. "Page" covers the "previous" scenario,
        // since we need to know the page we're on anyway.
        if (!paginationCursor || (paginationCursor && 'searchAfter' in paginationCursor)) {
          setHasNextPage(hasMoreEntries);
        } else if (paginationCursor && 'searchBefore' in paginationCursor) {
          // We've requested a previous page, therefore there is a next page.
          setHasNextPage(true);
        }
        setLogEntryAnomalies(anomalies);
      },
    },
    [
      endTime,
      sourceId,
      startTime,
      sortOptions,
      paginationOptions,
      setHasNextPage,
      paginationCursor,
      filteredDatasets,
    ]
  );

  const changeSortOptions = useCallback(
    (nextSortOptions: Sort) => {
      resetPagination();
      setSortOptions(nextSortOptions);
    },
    [setSortOptions, resetPagination]
  );

  const changePaginationOptions = useCallback(
    (nextPaginationOptions: PaginationOptions) => {
      resetPagination();
      setPaginationOptions(nextPaginationOptions);
    },
    [resetPagination, setPaginationOptions]
  );

  useEffect(() => {
    // Time range or dataset filters have changed
    resetPagination();
  }, [lastChangedTime, filteredDatasets, resetPagination]);

  useEffect(() => {
    // Refetch entries when options change
    getLogEntryAnomalies();
  }, [sortOptions, paginationOptions, getLogEntryAnomalies, page, paginationCursor]);

  const handleFetchNextPage = useCallback(() => {
    if (lastReceivedCursors) {
      setPage(page + 1);
      setPaginationCursor({
        searchAfter: lastReceivedCursors.nextPageCursor,
      });
    }
  }, [setPage, lastReceivedCursors, page]);

  const handleFetchPreviousPage = useCallback(() => {
    if (lastReceivedCursors) {
      setPage(page - 1);
      setPaginationCursor({
        searchBefore: lastReceivedCursors.previousPageCursor,
      });
    }
  }, [setPage, lastReceivedCursors, page]);

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
    sortOptions,
    changePaginationOptions,
    paginationOptions,
    fetchPreviousPage: page > 1 ? handleFetchPreviousPage : undefined,
    fetchNextPage: hasNextPage ? handleFetchNextPage : undefined,
    page,
  };
};
