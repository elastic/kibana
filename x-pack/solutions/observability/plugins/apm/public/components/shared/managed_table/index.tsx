/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty, merge, orderBy } from 'lodash';
import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from '../links/url_helpers';
import {
  getItemsFilteredBySearchQuery,
  TableSearchBar,
} from '../table_search_bar/table_search_bar';

type SortDirection = 'asc' | 'desc';

export interface TableOptions<T> {
  page: { index: number; size: number };
  sort: { direction: SortDirection; field: keyof T };
}

// TODO: this should really be imported from EUI
export interface ITableColumn<T extends object> {
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

export interface TableSearchBar<T> {
  isEnabled: boolean;
  fieldsToSearch: Array<keyof T>;
  maxCountExceeded: boolean;
  placeholder: string;
  onChangeSearchQuery: (searchQuery: string) => void;
  techPreview?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function defaultSortFn<T>(items: T[], sortField: keyof T, sortDirection: SortDirection) {
  return orderBy(items, sortField, sortDirection) as T[];
}

export type SortFunction<T> = (items: T[], sortField: keyof T, sortDirection: SortDirection) => T[];

export const shouldfetchServer = ({
  maxCountExceeded,
  newSearchQuery,
  oldSearchQuery,
}: {
  maxCountExceeded: boolean;
  newSearchQuery: string;
  oldSearchQuery: string;
}) => maxCountExceeded || !newSearchQuery.includes(oldSearchQuery);

function UnoptimizedManagedTable<T extends object>(props: {
  items: T[];
  columns: Array<ITableColumn<T>>;
  rowHeader?: string | false;
  noItemsMessage?: React.ReactNode;
  isLoading?: boolean;
  error?: boolean;

  // pagination
  pagination?: boolean;
  initialPageSize: number;
  initialPageIndex?: number;
  initialSortField?: string;
  initialSortDirection?: SortDirection;
  showPerPageOptions?: boolean;

  // onChange handlers
  onChangeRenderedItems?: (renderedItems: T[]) => void;
  onChangeSorting?: (sorting: TableOptions<T>['sort']) => void;

  // sorting
  sortItems?: boolean;
  sortFn?: SortFunction<T>;

  tableLayout?: 'auto' | 'fixed';
  tableSearchBar?: TableSearchBar<T>;
  saveTableOptionsToUrl?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const history = useHistory();

  const {
    items,
    columns,
    rowHeader,
    noItemsMessage,
    isLoading = false,
    error = false,

    // pagination
    pagination = true,
    initialPageIndex = 0,
    initialPageSize = 10,
    initialSortField = props.columns[0]?.field || '',
    initialSortDirection = 'asc',
    showPerPageOptions = true,

    // onChange handlers
    onChangeRenderedItems = () => {},
    onChangeSorting = () => {},

    // sorting
    sortItems = true,
    sortFn = defaultSortFn,

    saveTableOptionsToUrl = true,
    tableLayout,
    tableSearchBar = {
      isEnabled: false,
      fieldsToSearch: [],
      maxCountExceeded: false,
      placeholder: 'Search...',
      onChangeSearchQuery: () => {},
    },
  } = props;

  const {
    urlParams: {
      page: urlPageIndex = initialPageIndex,
      pageSize: urlPageSize = initialPageSize,
      sortField: urlSortField = initialSortField,
      sortDirection: urlSortDirection = initialSortDirection,
    },
  } = useLegacyUrlParams();

  const getStateFromUrl = useCallback(
    (): TableOptions<T> => ({
      page: { index: urlPageIndex, size: urlPageSize },
      sort: {
        field: urlSortField as keyof T,
        direction: urlSortDirection as SortDirection,
      },
    }),
    [urlPageIndex, urlPageSize, urlSortField, urlSortDirection]
  );

  // initialise table options state from url params
  const [tableOptions, setTableOptions] = useState(getStateFromUrl());

  // update table options state when url params change
  useEffect(() => setTableOptions(getStateFromUrl()), [getStateFromUrl]);

  // Clean up searchQuery when fast filter is toggled off
  useEffect(() => {
    if (!tableSearchBar.isEnabled) {
      setSearchQuery('');
    }
  }, [tableSearchBar.isEnabled]);

  // update table options state when `onTableChange` is invoked and persist to url
  const onTableChange = useCallback(
    (newTableOptions: Partial<TableOptions<T>>) => {
      setTableOptions((oldTableOptions) => merge({}, oldTableOptions, newTableOptions));

      if (saveTableOptionsToUrl) {
        history.push({
          ...history.location,
          search: fromQuery({
            ...toQuery(history.location.search),
            page: newTableOptions.page?.index,
            pageSize: newTableOptions.page?.size,
            sortField: newTableOptions.sort?.field,
            sortDirection: newTableOptions.sort?.direction,
          }),
        });
      }
    },
    [history, saveTableOptionsToUrl, setTableOptions]
  );

  const filteredItems = useMemo(() => {
    return isEmpty(searchQuery)
      ? items
      : getItemsFilteredBySearchQuery({
          items,
          fieldsToSearch: tableSearchBar.fieldsToSearch,
          searchQuery,
        });
  }, [items, searchQuery, tableSearchBar.fieldsToSearch]);

  const renderedItems = useMemo(() => {
    const sortedItems = sortItems
      ? sortFn(filteredItems, tableOptions.sort.field as keyof T, tableOptions.sort.direction)
      : filteredItems;

    return sortedItems.slice(
      tableOptions.page.index * tableOptions.page.size,
      (tableOptions.page.index + 1) * tableOptions.page.size
    );
  }, [
    sortItems,
    sortFn,
    filteredItems,
    tableOptions.sort.field,
    tableOptions.sort.direction,
    tableOptions.page.index,
    tableOptions.page.size,
  ]);

  useEffect(() => {
    onChangeRenderedItems(renderedItems);
  }, [onChangeRenderedItems, renderedItems]);

  const sorting = useMemo(
    () => ({ sort: tableOptions.sort as TableOptions<T>['sort'] }),
    [tableOptions.sort]
  );

  useEffect(() => onChangeSorting(sorting.sort), [onChangeSorting, sorting]);

  const paginationProps = useMemo(() => {
    if (!pagination) {
      return;
    }
    return {
      showPerPageOptions,
      totalItemCount: filteredItems.length,
      pageIndex: tableOptions.page.index,
      pageSize: tableOptions.page.size,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    };
  }, [
    pagination,
    showPerPageOptions,
    filteredItems.length,
    tableOptions.page.index,
    tableOptions.page.size,
  ]);

  const onChangeSearchQuery = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (
        shouldfetchServer({
          maxCountExceeded: tableSearchBar.maxCountExceeded,
          newSearchQuery: value,
          oldSearchQuery: searchQuery,
        })
      ) {
        tableSearchBar.onChangeSearchQuery(value);
      }
    },
    [searchQuery, tableSearchBar]
  );

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
      {tableSearchBar.isEnabled ? (
        <EuiFlexItem>
          <TableSearchBar
            placeholder={tableSearchBar.placeholder}
            searchQuery={searchQuery}
            onChangeSearchQuery={onChangeSearchQuery}
            techPreview={tableSearchBar.techPreview}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem>
        <EuiBasicTable<T>
          loading={isLoading}
          tableLayout={tableLayout}
          error={
            error
              ? i18n.translate('xpack.apm.managedTable.errorMessage', {
                  defaultMessage: 'Failed to fetch',
                })
              : ''
          }
          noItemsMessage={
            isLoading
              ? i18n.translate('xpack.apm.managedTable.loadingDescription', {
                  defaultMessage: 'Loading…',
                })
              : noItemsMessage
          }
          items={renderedItems}
          columns={columns as unknown as Array<EuiBasicTableColumn<T>>} // EuiBasicTableColumn is stricter than ITableColumn
          rowHeader={rowHeader === false ? undefined : rowHeader ?? columns[0]?.field}
          sorting={sorting}
          onChange={onTableChange}
          {...(paginationProps ? { pagination: paginationProps } : {})}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const ManagedTable = React.memo(UnoptimizedManagedTable) as typeof UnoptimizedManagedTable;

export { ManagedTable, UnoptimizedManagedTable };
