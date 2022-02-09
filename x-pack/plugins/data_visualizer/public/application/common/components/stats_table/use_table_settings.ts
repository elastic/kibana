/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction, EuiBasicTableProps, Pagination, PropertySort } from '@elastic/eui';
import { useCallback, useMemo } from 'react';

import type { DataVisualizerTableState } from '../../../../../common/types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface UseTableSettingsReturnValue<T> {
  onTableChange: EuiBasicTableProps<T>['onChange'];
  pagination: Pagination;
  sorting: { sort: PropertySort };
}

export function useTableSettings<TypeOfItem>(
  items: TypeOfItem[],
  pageState: DataVisualizerTableState,
  updatePageState: (update: DataVisualizerTableState) => void
): UseTableSettingsReturnValue<TypeOfItem> {
  const { pageIndex, pageSize, sortField, sortDirection } = pageState;

  const onTableChange: EuiBasicTableProps<TypeOfItem>['onChange'] = useCallback(
    ({ page, sort }) => {
      const result = {
        ...pageState,
        pageIndex: page?.index ?? pageState.pageIndex,
        pageSize: page?.size ?? pageState.pageSize,
        sortField: (sort?.field as string) ?? pageState.sortField,
        sortDirection: sort?.direction ?? pageState.sortDirection,
      };
      updatePageState(result);
    },
    [pageState, updatePageState]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: items.length,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    }),
    [items, pageIndex, pageSize]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField as string,
        direction: sortDirection as Direction,
      },
    }),
    [sortField, sortDirection]
  );

  return { onTableChange, pagination, sorting };
}
