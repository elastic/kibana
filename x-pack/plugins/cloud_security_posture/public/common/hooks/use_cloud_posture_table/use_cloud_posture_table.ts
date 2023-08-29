/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Dispatch, SetStateAction, useCallback } from 'react';
import { type DataView } from '@kbn/data-views-plugin/common';
import { BoolQuery } from '@kbn/es-query';
import { CriteriaWithPagination } from '@elastic/eui';
import { useUrlQuery } from '../use_url_query';
import { usePageSize } from '../use_page_size';
import { getDefaultQuery, useBaseEsQuery, usePersistedQuery } from './utils';

interface QuerySort {
  direction: string;
  id: string;
}

export interface CloudPostureTableResult {
  setUrlQuery: (query: any) => void;
  // TODO: remove any, this sorting is used for both EuiGrid and EuiTable which uses different types of sorts
  sort: any;
  filters: any[];
  query?: { bool: BoolQuery };
  queryError?: Error;
  pageIndex: number;
  // TODO: remove any, urlQuery is an object with query fields but we also add custom fields to it, need to assert usages
  urlQuery: any;
  setTableOptions: (options: CriteriaWithPagination<object>) => void;
  handleUpdateQuery: (query: any) => void;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number | undefined>>;
  onChangeItemsPerPage: (newPageSize: number) => void;
  onChangePage: (newPageIndex: number) => void;
  onSort: (sort: QuerySort[]) => void;
  onResetFilters: () => void;
}

/*
  Hook for managing common table state and methods for Cloud Posture
*/
export const useCloudPostureTable = ({
  defaultQuery = getDefaultQuery,
  dataView,
  paginationLocalStorageKey,
}: {
  defaultQuery?: (params: any) => any;
  dataView: DataView;
  paginationLocalStorageKey: string;
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
  });

  const handleUpdateQuery = useCallback(
    (query) => {
      setUrlQuery({ ...query, pageIndex: 0 });
    },
    [setUrlQuery]
  );

  return {
    setUrlQuery,
    sort: urlQuery.sort,
    filters: urlQuery.filters,
    query: baseEsQuery.query,
    queryError: baseEsQuery.error,
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
  };
};
