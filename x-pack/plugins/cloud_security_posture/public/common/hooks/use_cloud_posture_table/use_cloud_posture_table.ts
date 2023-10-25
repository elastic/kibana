/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Dispatch, SetStateAction, useCallback } from 'react';
import { type DataView } from '@kbn/data-views-plugin/common';
import { BoolQuery, Filter } from '@kbn/es-query';
import { CriteriaWithPagination } from '@elastic/eui';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { useUrlQuery } from '../use_url_query';
import { usePageSize } from '../use_page_size';
import { getDefaultQuery, useBaseEsQuery, usePersistedQuery } from './utils';
import { LOCAL_STORAGE_DATA_TABLE_COLUMNS_KEY } from '../../constants';

export interface CloudPostureTableResult {
  // TODO: Remove any when all finding tables are converted to CloudSecurityDataTable
  setUrlQuery: (query: any) => void;
  // TODO: Remove any when all finding tables are converted to CloudSecurityDataTable
  sort: any;
  // TODO: Remove any when all finding tables are converted to CloudSecurityDataTable
  filters: any[];
  query: { bool: BoolQuery };
  queryError?: Error;
  pageIndex: number;
  // TODO: remove any, urlQuery is an object with query fields but we also add custom fields to it, need to assert usages
  urlQuery: any;
  setTableOptions: (options: CriteriaWithPagination<object>) => void;
  // TODO: Remove any when all finding tables are converted to CloudSecurityDataTable
  handleUpdateQuery: (query: any) => void;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number | undefined>>;
  onChangeItemsPerPage: (newPageSize: number) => void;
  onChangePage: (newPageIndex: number) => void;
  // TODO: Remove any when all finding tables are converted to CloudSecurityDataTable
  onSort: (sort: any) => void;
  onResetFilters: () => void;
  columnsLocalStorageKey: string;
  getRowsFromPages: (data: Array<{ page: DataTableRecord[] }> | undefined) => DataTableRecord[];
}

/*
  Hook for managing common table state and methods for Cloud Posture
*/
export const useCloudPostureTable = ({
  defaultQuery = getDefaultQuery,
  dataView,
  paginationLocalStorageKey,
  columnsLocalStorageKey,
  additionalFilters,
  pageIndexUrlSuffix = '',
}: {
  // TODO: Remove any when all finding tables are converted to CloudSecurityDataTable
  defaultQuery?: (params: any) => any;
  dataView: DataView;
  paginationLocalStorageKey: string;
  columnsLocalStorageKey?: string;
  additionalFilters?: Filter[];
}): CloudPostureTableResult => {
  const getPersistedDefaultQuery = usePersistedQuery(defaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
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
    dataView,
    filters: urlQuery.filters,
    query: urlQuery.query,
    ...(additionalFilters ? { additionalFilters } : {}),
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
    query: baseEsQuery.query,
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
