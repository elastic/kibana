/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { type DataView } from '@kbn/data-views-plugin/common';
import { useUrlQuery } from '../use_url_query';
import { usePageSize } from '../use_page_size';
import { getDefaultQuery, useBaseEsQuery, usePersistedQuery } from './utils';

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
}) => {
  const getPersistedDefaultQuery = usePersistedQuery(defaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
  const { pageSize, setPageSize } = usePageSize(paginationLocalStorageKey);

  const onChangeItemsPerPage = useCallback(
    (newPageSize) => {
      setPageSize(newPageSize);
      setUrlQuery({
        pageIndex: 0,
      });
    },
    [setUrlQuery, setPageSize]
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
