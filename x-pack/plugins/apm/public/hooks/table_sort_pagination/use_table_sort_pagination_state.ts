/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CriteriaWithPagination } from '@elastic/eui';
import { useState } from 'react';
import {
  TableSortPaginationProps,
  useTableSortAndPagination,
} from './use_table_sort_pagination';

export function useTableSortAndPaginationState<T extends any[]>({
  items,
  pagination,
  sorting,
  ...rest
}: TableSortPaginationProps<T>) {
  const [tableOptions, setTableOptions] = useState<
    CriteriaWithPagination<T[0]>
  >({
    page: {
      index: pagination.pageIndex,
      size: pagination.pageSize,
    },
    sort: sorting?.sort,
  });

  const tableSortAndPagination = useTableSortAndPagination({
    items,
    pagination,
    sorting,
    tableOptions,
    onTableChange: setTableOptions,
    ...rest,
  });

  return tableSortAndPagination;
}
