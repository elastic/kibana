/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useQuery } from '@tanstack/react-query';
import { EuiDataGridSorting } from '@elastic/eui';
import { useInspector } from '../../../hooks/use_inspector';
import { useKibana } from '../../../hooks/use_kibana';
import { Indicator } from '../../../../common/types/indicator';
import { useSourcererDataView } from './use_sourcerer_data_view';
import { createFetchIndicators, FetchParams, Pagination } from '../services/fetch_indicators';

const PAGE_SIZES = [10, 25, 50];

export const DEFAULT_PAGE_SIZE = PAGE_SIZES[1];

export interface UseIndicatorsParams {
  filterQuery: Query;
  filters: Filter[];
  timeRange: TimeRange;
  sorting: EuiDataGridSorting['columns'];
}

export interface UseIndicatorsValue {
  /**
   * Array of {@link Indicator} ready to render inside the IndicatorTable component
   */
  indicators: Indicator[];
  indicatorCount: number;
  pagination: Pagination;
  onChangeItemsPerPage: (value: number) => void;
  onChangePage: (value: number) => void;

  /**
   * No data loaded yet
   */
  isLoading: boolean;

  /**
   * Data loading is in progress (see docs on `isFetching` here: https://tanstack.com/query/v4/docs/guides/queries)
   */
  isFetching: boolean;

  dataUpdatedAt: number;

  query: { refetch: VoidFunction; id: string; loading: boolean };
}

const QUERY_ID = 'indicatorsTable';

export const useIndicators = ({
  filters,
  filterQuery,
  sorting,
  timeRange,
}: UseIndicatorsParams): UseIndicatorsValue => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();
  const { selectedPatterns } = useSourcererDataView();
  const { inspectorAdapters } = useInspector();

  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageSize,
        pageIndex: 0,
      })),
    []
  );

  const onChangePage = useCallback(
    (pageIndex) => setPagination((currentPagination) => ({ ...currentPagination, pageIndex })),
    []
  );

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
  });

  // Go to first page after filters are changed
  useEffect(() => {
    onChangePage(0);
  }, [filters, filterQuery, timeRange, sorting, onChangePage]);

  const fetchIndicators = useMemo(
    () => createFetchIndicators({ searchService, inspectorAdapter: inspectorAdapters.requests }),
    [inspectorAdapters, searchService]
  );

  const { isLoading, isFetching, data, refetch, dataUpdatedAt } = useQuery(
    [
      QUERY_ID,
      {
        timeRange,
        filterQuery,
        filters,
        selectedPatterns,
        sorting,
        pagination,
      },
    ],
    ({ signal, queryKey: [_key, queryParams] }) =>
      fetchIndicators(queryParams as FetchParams, signal),
    {
      /**
       * See https://tanstack.com/query/v4/docs/guides/paginated-queries
       * This is essential for our ux
       */
      keepPreviousData: true,
    }
  );

  const query = useMemo(
    () => ({ refetch, id: QUERY_ID, loading: isLoading }),
    [isLoading, refetch]
  );

  return {
    indicators: data?.indicators || [],
    indicatorCount: data?.total || 0,
    pagination,
    onChangePage,
    onChangeItemsPerPage,
    isLoading,
    isFetching,
    dataUpdatedAt,
    query,
  };
};
