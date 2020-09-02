/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { Direction, EuiBasicTableProps, EuiTableSortingType } from '@elastic/eui';
import sortBy from 'lodash/sortBy';
import get from 'lodash/get';
import { DataFrameAnalyticsListColumn, DataFrameAnalyticsListRow } from './common';

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const jobPropertyMap = {
  ID: 'id',
  Status: 'state',
  Type: 'job_type',
};

interface AnalyticsBasicTableSettings {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  hidePerPageOptions: boolean;
  sortField: string;
  sortDirection: Direction;
}

interface UseTableSettingsReturnValue {
  onTableChange: EuiBasicTableProps<DataFrameAnalyticsListRow>['onChange'];
  pageOfItems: DataFrameAnalyticsListRow[];
  pagination: EuiBasicTableProps<DataFrameAnalyticsListRow>['pagination'];
  sorting: EuiTableSortingType<any>;
}

export function useTableSettings(items: DataFrameAnalyticsListRow[]): UseTableSettingsReturnValue {
  const [tableSettings, setTableSettings] = useState<AnalyticsBasicTableSettings>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
    totalItemCount: 0,
    hidePerPageOptions: false,
    sortField: DataFrameAnalyticsListColumn.id,
    sortDirection: 'asc',
  });

  const getPageOfItems = (
    list: any[],
    index: number,
    size: number,
    sortField: string,
    sortDirection: Direction
  ) => {
    list = sortBy(list, (item) =>
      get(item, jobPropertyMap[sortField as keyof typeof jobPropertyMap] || sortField)
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
      pageOfItems: list.slice(pageStart, pageStart + size),
      totalItemCount: listLength,
    };
  };

  const onTableChange = ({
    page = { index: 0, size: PAGE_SIZE },
    sort = { field: DataFrameAnalyticsListColumn.id, direction: 'asc' },
  }: {
    page?: { index: number; size: number };
    sort?: { field: string; direction: Direction };
  }) => {
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

  const { pageOfItems, totalItemCount } = getPageOfItems(
    items,
    pageIndex,
    pageSize,
    sortField,
    sortDirection
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return { onTableChange, pageOfItems, pagination, sorting };
}
