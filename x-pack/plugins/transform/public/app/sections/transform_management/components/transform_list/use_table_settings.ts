/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { Direction, EuiBasicTableProps, Pagination, PropertySort } from '@elastic/eui';

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Copying from EUI EuiBasicTable types as type is not correctly picked up for table's onChange
// Can be removed when https://github.com/elastic/eui/issues/4011 is addressed in EUI
export interface Criteria<T> {
  page?: {
    index: number;
    size: number;
  };
  sort?: {
    field: keyof T;
    direction: Direction;
  };
}
export interface CriteriaWithPagination<T> extends Criteria<T> {
  page: {
    index: number;
    size: number;
  };
}

interface AnalyticsBasicTableSettings<T> {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  showPerPageOptions: boolean;
  sortField: keyof T;
  sortDirection: Direction;
}

interface UseTableSettingsReturnValue<T> {
  onTableChange: EuiBasicTableProps<T>['onChange'];
  pagination: Pagination;
  sorting: { sort: PropertySort };
}

export function useTableSettings<TypeOfItem>(
  sortByField: keyof TypeOfItem,
  items: TypeOfItem[]
): UseTableSettingsReturnValue<TypeOfItem> {
  const [tableSettings, setTableSettings] = useState<AnalyticsBasicTableSettings<TypeOfItem>>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
    totalItemCount: 0,
    showPerPageOptions: true,
    sortField: sortByField,
    sortDirection: 'asc',
  });

  const onTableChange: EuiBasicTableProps<TypeOfItem>['onChange'] = ({
    page = { index: 0, size: PAGE_SIZE },
    sort = { field: sortByField, direction: 'asc' },
  }: CriteriaWithPagination<TypeOfItem>) => {
    const { index, size } = page;
    const { field, direction } = sort;

    setTableSettings({
      ...tableSettings,
      pageIndex: index,
      pageSize: size,
      sortField: field,
      sortDirection: direction,
    });
  };

  const { pageIndex, pageSize, sortField, sortDirection } = tableSettings;

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: items.length,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };

  const sorting = {
    sort: {
      field: sortField as string,
      direction: sortDirection,
    },
  };
  return { onTableChange, pagination, sorting };
}
