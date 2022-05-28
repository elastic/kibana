/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { orderBy } from 'lodash';
import React, { ReactNode, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from '../links/url_helpers';

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

interface Props<T> {
  items: T[];
  columns: Array<ITableColumn<T>>;
  initialPageIndex?: number;
  initialPageSize?: number;
  initialSortField?: ITableColumn<T>['field'];
  initialSortDirection?: 'asc' | 'desc';
  showPerPageOptions?: boolean;
  noItemsMessage?: React.ReactNode;
  sortItems?: boolean;
  sortFn?: (
    items: T[],
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ) => T[];
  pagination?: boolean;
  isLoading?: boolean;
  error?: boolean;
  tableLayout?: 'auto' | 'fixed';
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const INITIAL_PAGE_SIZE = 25;

function defaultSortFn<T extends any>(
  items: T[],
  sortField: string,
  sortDirection: 'asc' | 'desc'
) {
  return orderBy(items, sortField, sortDirection);
}

function UnoptimizedManagedTable<T>(props: Props<T>) {
  const history = useHistory();
  const {
    items,
    columns,
    initialPageIndex = 0,
    initialPageSize = INITIAL_PAGE_SIZE,
    initialSortField = props.columns[0]?.field || '',
    initialSortDirection = 'asc',
    showPerPageOptions = true,
    noItemsMessage,
    sortItems = true,
    sortFn = defaultSortFn,
    pagination = true,
    isLoading = false,
    error = false,
    tableLayout,
  } = props;

  const {
    urlParams: {
      page = initialPageIndex,
      pageSize = initialPageSize,
      sortField = initialSortField,
      sortDirection = initialSortDirection,
    },
  } = useLegacyUrlParams();

  const renderedItems = useMemo(() => {
    const sortedItems = sortItems
      ? sortFn(items, sortField, sortDirection as 'asc' | 'desc')
      : items;

    return sortedItems.slice(page * pageSize, (page + 1) * pageSize);
  }, [page, pageSize, sortField, sortDirection, items, sortItems, sortFn]);

  const sort = useMemo(() => {
    return {
      sort: {
        field: sortField as keyof T,
        direction: sortDirection as 'asc' | 'desc',
      },
    };
  }, [sortField, sortDirection]);

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: keyof T; direction: 'asc' | 'desc' };
    }) => {
      history.push({
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          page: options.page.index,
          pageSize: options.page.size,
          sortField: options.sort?.field,
          sortDirection: options.sort?.direction,
        }),
      });
    },
    [history]
  );

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
