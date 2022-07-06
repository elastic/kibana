/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CriteriaWithPagination,
  EuiTableSortingType,
  Pagination,
} from '@elastic/eui';
import { orderBy } from 'lodash';
import { useMemo } from 'react';
import uuid from 'uuid';

export interface TableSortPaginationProps<T extends any[]> {
  items: T;
  // totalItemCount is not necessary here
  pagination: Omit<Pagination, 'totalItemCount'>;
  sorting?: EuiTableSortingType<T[0]>;
  // Used to update the tableItems when the comparison values are changed
  comparison?: {
    offset?: string;
    comparisonEnabled?: boolean;
  };
}

type Props<T extends any[]> = TableSortPaginationProps<T> & {
  tableOptions: CriteriaWithPagination<T[0]>;
  onTableChange: (criteriaWithPagination: CriteriaWithPagination<T[0]>) => void;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function useTableSortAndPagination<T extends any[]>({
  items,
  pagination,
  sorting,
  tableOptions,
  onTableChange,
  comparison = {},
}: Props<T>): {
  onTableChange: (criteriaWithPagination: CriteriaWithPagination<T[0]>) => void;
  tableSort?: EuiTableSortingType<T[0]>;
  tablePagination: Pagination;
  tableItems: any[];
  totalItems: number;
  requestId: string;
} {
  const { offset, comparisonEnabled } = comparison;

  const { tableItems, requestId } = useMemo(
    () => {
      return {
        tableItems: orderBy(
          items,
          tableOptions.sort?.field,
          tableOptions.sort?.direction
        ).slice(
          tableOptions.page.index * tableOptions.page.size,
          (tableOptions.page.index + 1) * tableOptions.page.size
        ),
        // Generate a new id everytime the table options are changed
        requestId: uuid(),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      items,
      tableOptions,
      // not used, but needed to trigger an update when offset is changed either manually by user or when time range is changed
      offset,
      // not used, but needed to trigger an update when comparison feature is disabled/enabled by user
      comparisonEnabled,
    ]
  );

  const tablePagination: Pagination = useMemo(
    () => ({
      pageIndex: tableOptions.page.index,
      pageSize: tableOptions.page.size,
      totalItemCount: items.length,
      pageSizeOptions: pagination.pageSizeOptions || PAGE_SIZE_OPTIONS,
      showPerPageOptions: pagination.showPerPageOptions || false,
    }),
    [tableOptions, items, pagination]
  );

  const tableSort: EuiTableSortingType<T[0]> = useMemo(() => {
    return { ...(sorting || {}), sort: tableOptions.sort };
  }, [tableOptions, sorting]);

  return {
    requestId,
    onTableChange,
    tableSort,
    tablePagination,
    tableItems,
    totalItems: items.length,
  };
}
