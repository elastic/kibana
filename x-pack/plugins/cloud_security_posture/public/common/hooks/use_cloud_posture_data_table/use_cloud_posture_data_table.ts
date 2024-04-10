/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Dispatch, SetStateAction, useCallback } from 'react';
import { BoolQuery, Filter } from '@kbn/es-query';
import { CriteriaWithPagination } from '@elastic/eui';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { useUrlQuery } from '../use_url_query';
import { usePageSize } from '../use_page_size';
import { getDefaultQuery } from './utils';
import { LOCAL_STORAGE_DATA_TABLE_COLUMNS_KEY } from '../../constants';
import { FindingsBaseURLQuery } from '../../types';
import { useBaseEsQuery } from './use_base_es_query';
import { usePersistedQuery } from './use_persisted_query';

type URLQuery = FindingsBaseURLQuery & Record<string, any>;

type SortOrder = [string, string];

export interface CloudPostureDataTableResult {
  setUrlQuery: (query: Record<string, any>) => void;
  sort: SortOrder[];
  filters: Filter[];
  query: { bool: BoolQuery };
  queryError?: Error;
  pageIndex: number;
  urlQuery: URLQuery;
  setTableOptions: (options: CriteriaWithPagination<object>) => void;
  handleUpdateQuery: (query: URLQuery) => void;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number | undefined>>;
  onChangeItemsPerPage: (newPageSize: number) => void;
  onChangePage: (newPageIndex: number) => void;
  onSort: (sort: string[][]) => void;
  onResetFilters: () => void;
  columnsLocalStorageKey: string;
  getRowsFromPages: (data: Array<{ page: DataTableRecord[] }> | undefined) => DataTableRecord[];
}

/*
  Hook for managing common table state and methods for the Cloud Posture DataTable
*/
export const useCloudPostureDataTable = ({
  defaultQuery = getDefaultQuery,
  paginationLocalStorageKey,
  columnsLocalStorageKey,
  nonPersistedFilters,
}: {
  defaultQuery?: (params: FindingsBaseURLQuery) => FindingsBaseURLQuery;
  paginationLocalStorageKey: string;
  columnsLocalStorageKey?: string;
  nonPersistedFilters?: Filter[];
}): CloudPostureDataTableResult => {
  const getPersistedDefaultQuery = usePersistedQuery(defaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery<URLQuery>(getPersistedDefaultQuery);
  const { pageSize, setPageSize } = usePageSize(paginationLocalStorageKey);

  const onChangeItemsPerPage = useCallback(
    (newPageSize) => {
      setPageSize(newPageSize);
      setUrlQuery({
        pageIndex: 0,
        pageSize: newPageSize,
      });
    },
    [setPageSize, setUrlQuery]
  );

  const onResetFilters = useCallback(() => {
    setUrlQuery({
      pageIndex: 0,
      filters: [],
      query: {
        query: '',
        language: 'kuery',
      },
    });
  }, [setUrlQuery]);

  const onChangePage = useCallback(
    (newPageIndex) => {
      setUrlQuery({
        pageIndex: newPageIndex,
      });
    },
    [setUrlQuery]
  );

  const onSort = useCallback(
    (sort) => {
      setUrlQuery({
        sort,
      });
    },
    [setUrlQuery]
  );

  const setTableOptions = useCallback(
    ({ page, sort }) => {
      setPageSize(page.size);
      setUrlQuery({
        sort,
        pageIndex: page.index,
      });
    },
    [setUrlQuery, setPageSize]
  );

  /**
   * Page URL query to ES query
   */
  const baseEsQuery = useBaseEsQuery({
    filters: urlQuery.filters,
    query: urlQuery.query,
    ...(nonPersistedFilters ? { nonPersistedFilters } : {}),
  });

  const handleUpdateQuery = useCallback(
    (query) => {
      setUrlQuery({ ...query, pageIndex: 0 });
    },
    [setUrlQuery]
  );

  const getRowsFromPages = (data: Array<{ page: DataTableRecord[] }> | undefined) =>
    data
      ?.map(({ page }: { page: DataTableRecord[] }) => {
        return page;
      })
      .flat() || [];

  const queryError = baseEsQuery instanceof Error ? baseEsQuery : undefined;

  return {
    setUrlQuery,
    sort: urlQuery.sort,
    filters: urlQuery.filters,
    query: baseEsQuery.query
      ? baseEsQuery.query
      : {
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not: [],
          },
        },
    queryError,
    pageIndex: urlQuery.pageIndex,
    urlQuery,
    setTableOptions,
    handleUpdateQuery,
    pageSize,
    setPageSize,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    onResetFilters,
    columnsLocalStorageKey: columnsLocalStorageKey || LOCAL_STORAGE_DATA_TABLE_COLUMNS_KEY,
    getRowsFromPages,
  };
};
