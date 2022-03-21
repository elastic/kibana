/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import React, { ReactNode, useMemo } from 'react';

// TODO: this should really be imported from EUI
export interface ITableColumn<T> {
  name: ReactNode;
  actions?: Array<Record<string, unknown>>;
  field?: string;
  dataType?: string;
  align?: string;
  width?: string;
  sortable?: boolean;
  truncateText?: boolean;
  render?: (value: any, item: T) => unknown;
}

type SortDirection = 'asc' | 'desc';

export interface CommonProps<T> {
  items: T[];
  columns: Array<ITableColumn<T>>;
  initialPageIndex?: number;
  initialPageSize?: number;
  initialSortField?: keyof T;
  initialSortDirection?: SortDirection;
  showPerPageOptions?: boolean;
  noItemsMessage?: React.ReactNode;
  sortItems?: boolean;
  sortFn?: (items: T[], sortField: string, sortDirection: SortDirection) => T[];
  pagination?: boolean;
  isLoading?: boolean;
  error?: boolean;
  tableLayout?: 'auto' | 'fixed';
}

interface Props<T> extends CommonProps<T> {
  page?: number;
  pageSize?: number;
  sortField?: keyof T;
  sortDirection?: string;
  onTableChange: (tableOptions: CriteriaWithPagination<T>) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];
export const INITIAL_PAGE_SIZE = 25;

function defaultSortFn<T extends any>(
  items: T[],
  sortField: string,
  sortDirection: SortDirection
) {
  return orderBy(items, sortField, sortDirection);
}

function UnoptimizedManagedTable<T>(props: Props<T>) {
  const {
    items,
    columns,
    showPerPageOptions = true,
    noItemsMessage,
    sortItems = true,
    sortFn = defaultSortFn,
    pagination = true,
    isLoading = false,
    error = false,
    tableLayout,
    page = 0,
    pageSize = INITIAL_PAGE_SIZE,
    sortField = props.columns[0]?.field || '',
    sortDirection = 'asc',
    onTableChange,
  } = props;

  const renderedItems = useMemo(() => {
    const sortedItems = sortItems
      ? sortFn(items, sortField as string, sortDirection as SortDirection)
      : items;

    return sortedItems.slice(page * pageSize, (page + 1) * pageSize);
  }, [page, pageSize, sortField, sortDirection, items, sortItems, sortFn]);

  const sort = useMemo(() => {
    return {
      sort: {
        field: sortField as keyof T,
        direction: sortDirection as SortDirection,
      },
    };
  }, [sortField, sortDirection]);

  const paginationProps = useMemo(() => {
    if (!pagination) {
      return;
    }
    return {
      showPerPageOptions,
      totalItemCount: items.length,
      pageIndex: page,
      pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    };
  }, [showPerPageOptions, items, page, pageSize, pagination]);

  const showNoItemsMessage = useMemo(() => {
    return isLoading
      ? i18n.translate('xpack.apm.managedTable.loadingDescription', {
          defaultMessage: 'Loading…',
        })
      : noItemsMessage;
  }, [isLoading, noItemsMessage]);

  return (
    // @ts-expect-error TS thinks pagination should be non-nullable, but it's not
    <EuiBasicTable
      loading={isLoading}
      tableLayout={tableLayout}
      error={
        error
          ? i18n.translate('xpack.apm.managedTable.errorMessage', {
              defaultMessage: 'Failed to fetch',
            })
          : ''
      }
      noItemsMessage={showNoItemsMessage}
      items={renderedItems}
      columns={columns as unknown as Array<EuiBasicTableColumn<T>>} // EuiBasicTableColumn is stricter than ITableColumn
      sorting={sort}
      onChange={onTableChange}
      {...(paginationProps ? { pagination: paginationProps } : {})}
    />
  );
}

const ManagedTable = React.memo(
  UnoptimizedManagedTable
) as typeof UnoptimizedManagedTable;

export { ManagedTable, UnoptimizedManagedTable };
