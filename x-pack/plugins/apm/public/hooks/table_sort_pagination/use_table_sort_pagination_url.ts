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
import {
  TableSortPaginationProps,
  useTableSortAndPagination,
} from './use_table_sort_pagination';

export function useTableSortAndPaginationUrl<T extends any[]>({
  items,
  pagination,
  sorting,
}: TableSortPaginationProps<T>) {
  const history = useHistory();

  const { pageIndex, pageSize } = pagination;
  const { field, direction } = sorting?.sort || {};

  const tableOptions: CriteriaWithPagination<T[0]> = useMemo(
    () => ({
      page: { index: pageIndex, size: pageSize },
      sort: field && direction ? { field, direction } : undefined,
    }),
    [pageIndex, pageSize, field, direction]
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
    pagination,
    sorting,
    tableOptions,
    onTableChange,
  });

  return tableSortAndPagination;
}
