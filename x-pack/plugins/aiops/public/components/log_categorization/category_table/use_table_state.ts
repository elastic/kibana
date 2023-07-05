/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { EuiInMemoryTable, Direction, Pagination } from '@elastic/eui';

export type UseTableState = ReturnType<typeof useTableState>;
export function useTableState<T>(
  items: T[],
  initialSortField: keyof T,
  initialSortDirection: Direction = 'asc'
) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof T>(initialSortField);
  const [sortDirection, setSortDirection] = useState<Direction>(initialSortDirection);

  const onTableChange: EuiInMemoryTable<T>['onTableChange'] = ({
    page = { index: 0, size: 10 },
    sort = { field: sortField, direction: sortDirection },
  }) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction as Direction);
  };

  const pagination: Pagination = {
    pageIndex,
    pageSize,
    totalItemCount: (items ?? []).length,
    pageSizeOptions: [10, 20, 50],
    showPerPageOptions: true,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return { onTableChange, pagination, sorting, setPageIndex };
}
