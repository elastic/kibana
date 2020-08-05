/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { orderBy } from 'lodash';
import React, { ReactNode, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../Links/url_helpers';

// TODO: this should really be imported from EUI
export interface ITableColumn<T> {
  name: ReactNode;
  actions?: Array<Record<string, unknown>>;
  field?: string;
  dataType?: string;
  align?: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, item: T) => unknown;
}

interface Props<T> {
  items: T[];
  columns: Array<ITableColumn<T>>;
  initialPageIndex?: number;
  initialPageSize?: number;
  initialSortField?: ITableColumn<T>['field'];
  initialSortDirection?: 'asc' | 'desc';
  hidePerPageOptions?: boolean;
  noItemsMessage?: React.ReactNode;
  sortItems?: boolean;
  pagination?: boolean;
}

function UnoptimizedManagedTable<T>(props: Props<T>) {
  const history = useHistory();
  const {
    items,
    columns,
    initialPageIndex = 0,
    initialPageSize = 10,
    initialSortField = props.columns[0]?.field || '',
    initialSortDirection = 'asc',
    hidePerPageOptions = true,
    noItemsMessage,
    sortItems = true,
    pagination = true,
  } = props;

  const {
    urlParams: {
      page = initialPageIndex,
      pageSize = initialPageSize,
      sortField = initialSortField,
      sortDirection = initialSortDirection,
    },
  } = useUrlParams();

  const renderedItems = useMemo(() => {
    const sortedItems = sortItems
      ? orderBy(items, sortField, sortDirection as 'asc' | 'desc')
      : items;

    return sortedItems.slice(page * pageSize, (page + 1) * pageSize);
  }, [page, pageSize, sortField, sortDirection, items, sortItems]);

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
          sortField: options.sort!.field,
          sortDirection: options.sort!.direction,
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
      hidePerPageOptions,
      totalItemCount: items.length,
      pageIndex: page,
      pageSize,
    };
  }, [hidePerPageOptions, items, page, pageSize, pagination]);

  return (
    <EuiBasicTable
      noItemsMessage={noItemsMessage}
      items={renderedItems}
      columns={(columns as unknown) as Array<EuiBasicTableColumn<T>>} // EuiBasicTableColumn is stricter than ITableColumn
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
