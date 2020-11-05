/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { Direction, EuiBasicTableProps, Pagination, PropertySort } from '@elastic/eui';
import { sortBy } from 'lodash';
import { get } from 'lodash';

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const propertyMap = {
  Mode: 'mode',
};

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
  hidePerPageOptions: boolean;
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
    hidePerPageOptions: false,
    sortField: sortByField,
    sortDirection: 'asc',
  });

  const getPageOfItems = (
    list: TypeOfItem[],
    index: number,
    size: number,
    sortField: keyof TypeOfItem,
    sortDirection: Direction
  ) => {
    list = sortBy(list, (item) =>
      get(item, propertyMap[sortField as keyof typeof propertyMap] || sortField)
    );
    list = sortDirection === 'asc' ? list : list.reverse();
    const listLength = list.length;

    let pageStart = index * size;
    if (pageStart >= listLength && listLength !== 0) {
      // if the page start is larger than the number of items due to
      // filters being applied or items being deleted, calculate a new page start
      pageStart = Math.floor((listLength - 1) / size) * size;

      setTableSettings({ ...tableSettings, pageIndex: pageStart / size });
    }
    return {
      totalItemCount: listLength,
    };
  };

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

  const { totalItemCount } = getPageOfItems(items, pageIndex, pageSize, sortField, sortDirection);

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
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
