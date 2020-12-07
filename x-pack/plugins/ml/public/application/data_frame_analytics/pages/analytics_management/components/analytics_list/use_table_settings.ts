/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, EuiBasicTableProps, Pagination, PropertySort } from '@elastic/eui';
import { useCallback, useMemo } from 'react';
import { ListingPageUrlState } from '../../../../../../../common/types/common';

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

interface UseTableSettingsReturnValue<T> {
  onTableChange: EuiBasicTableProps<T>['onChange'];
  pagination: Pagination;
  sorting: { sort: PropertySort };
}

export function useTableSettings<TypeOfItem>(
  items: TypeOfItem[],
  pageState: ListingPageUrlState,
  updatePageState: (update: Partial<ListingPageUrlState>) => void
): UseTableSettingsReturnValue<TypeOfItem> {
  const { pageIndex, pageSize, sortField, sortDirection } = pageState;

  const onTableChange: EuiBasicTableProps<TypeOfItem>['onChange'] = useCallback(
    ({ page, sort }: CriteriaWithPagination<TypeOfItem>) => {
      const result = {
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
