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
  initialPagination,
  initialSort = {},
}: TableSortPaginationProps<T>) {
  const [tableOptions, setTableOptions] = useState<
    CriteriaWithPagination<T[0]>
  >({
    page: {
      index: initialPagination.pageIndex,
      size: initialPagination.pageSize,
    },
    sort: initialSort.sort,
  });

  const tableSortAndPagination = useTableSortAndPagination({
    items,
    initialPagination,
    initialSort,
    tableOptions,
    onTableChange: setTableOptions,
  });

  return tableSortAndPagination;
}
