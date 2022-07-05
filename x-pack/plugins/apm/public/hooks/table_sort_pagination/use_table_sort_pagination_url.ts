/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CriteriaWithPagination } from '@elastic/eui';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { fromQuery, toQuery } from '../../components/shared/links/url_helpers';
import { useApmParams } from '../use_apm_params';
import {
  TableSortPaginationProps,
  useTableSortAndPagination,
} from './use_table_sort_pagination';

export function useTableSortAndPaginationUrl<T extends any[]>({
  items,
  initialPagination,
  initialSort = {},
}: TableSortPaginationProps<T>) {
  const history = useHistory();
  const { query } = useApmParams('/*');
  const pageUrl =
    'page' in query && query.page ? query.page : initialPagination.pageIndex;
  const pageSizeUrl =
    'pageSize' in query && query.pageSize
      ? query.pageSize
      : initialPagination.pageSize;
  const sortFieldUrl =
    'sortField' in query
      ? (query.sortField as keyof T[0])
      : initialSort.sort?.field;
  const sortDirectionUrl =
    'sortDirection' in query
      ? query.sortDirection
      : initialSort.sort?.direction;

  const tableOptions: CriteriaWithPagination<T[0]> = useMemo(
    () => ({
      page: { index: pageUrl, size: pageSizeUrl },
      sort:
        sortFieldUrl && sortDirectionUrl
          ? { field: sortFieldUrl, direction: sortDirectionUrl }
          : undefined,
    }),
    [pageUrl, pageSizeUrl, sortFieldUrl, sortDirectionUrl]
  );

  function onTableChange(newTableOptions: CriteriaWithPagination<T[0]>) {
    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        page: newTableOptions.page.index,
        pageSize: newTableOptions.page.size,
        sortField: newTableOptions.sort?.field,
        sortDirection: newTableOptions.sort?.direction,
      }),
    });
  }

  const tableSortAndPagination = useTableSortAndPagination({
    items,
    initialPagination,
    initialSort,
    tableOptions,
    onTableChange,
  });

  return tableSortAndPagination;
}
