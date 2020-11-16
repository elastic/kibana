/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, EuiBasicTableProps, Pagination, PropertySort } from '@elastic/eui';
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
  const onTableChange: EuiBasicTableProps<TypeOfItem>['onChange'] = ({
    page,
    sort,
  }: CriteriaWithPagination<TypeOfItem>) => {
    updatePageState({
      ...(page ? { pageIndex: page.index, pageSize: page.size } : {}),
      ...(sort ? { sortField: sort.field as string, sortDirection: sort.direction } : {}),
    });
  };

  const { pageIndex, pageSize, sortField, sortDirection } = pageState;

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: items.length,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };

  const sorting = {
    sort: {
      field: sortField as string,
      direction: sortDirection as Direction,
    },
  };

  return { onTableChange, pagination, sorting };
}
