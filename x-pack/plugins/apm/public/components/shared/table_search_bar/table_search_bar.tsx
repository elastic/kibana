/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import { orderBy } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { apmEnableTableSearchBar } from '@kbn/observability-plugin/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

interface TableOptions<T> {
  page: { index: number; size: number };
  sort: { direction: 'asc' | 'desc'; field: keyof T };
}

export interface CurrentPage<T> {
  items: T[];
  totalCount: number;
}

export function TableSearchBar<T>(props: {
  items: T[];
  fieldsToSearch: Array<keyof T>;
  maxCountExceeded: boolean;
  onChangeCurrentPage: (page: CurrentPage<T>) => void;
  onChangeSearchQuery: OnChangeSearchQuery;
  placeholder: string;
  tableOptions: TableOptions<T>;
  isEnabled: boolean;
  sortItems?: boolean;
  sortFn?: SortFunction<T>;
}) {
  const {
    items,
    fieldsToSearch,
    maxCountExceeded,
    onChangeCurrentPage,
    onChangeSearchQuery,
    placeholder,
    tableOptions,
    isEnabled,
    sortItems = true,
    sortFn = defaultSortFn,
  } = props;

  const [searchQuery, setSearchQuery] = useState('');

  const { core } = useApmPluginContext();
  const isTableSearchBarEnabled = core.uiSettings.get<boolean>(
    apmEnableTableSearchBar,
    false
  );

  const currentPage = useMemo(() => {
    return getCurrentPage({
      items,
      fieldsToSearch,
      maxCountExceeded,
      searchQuery,
      tableOptions,
      sortItems,
      sortFn,
    });

    // we need to spread `fieldsToSearch` because it's an array and we want to compare its values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...fieldsToSearch,
    maxCountExceeded,
    searchQuery,
    tableOptions,
    sortItems,
    sortFn,
  ]);

  useEffect(() => {
    onChangeCurrentPage(currentPage);
  }, [currentPage, onChangeCurrentPage]);

  if (!isTableSearchBarEnabled || !isEnabled) {
    return null;
  }

  return (
    <EuiFieldSearch
      data-test-subj="tableSearchInput"
      placeholder={placeholder}
      fullWidth={true}
      value={searchQuery}
      onChange={(e) => {
        const shouldFetchServer =
          maxCountExceeded || !e.target.value.includes(searchQuery);

        setSearchQuery(e.target.value);
        onChangeSearchQuery({ searchQuery: e.target.value, shouldFetchServer });
      }}
    />
  );
}

function getCurrentPage<T>({
  items,
  fieldsToSearch,
  maxCountExceeded,
  searchQuery,
  tableOptions,
  sortItems,
  sortFn,
}: {
  items: T[];
  fieldsToSearch: Array<keyof T>;
  maxCountExceeded: boolean;
  searchQuery?: string;
  tableOptions: TableOptions<T>;
  sortItems: boolean;
  sortFn: SortFunction<T>;
}): CurrentPage<T> {
  const shouldFilterClientSide = searchQuery && !maxCountExceeded;
  const itemsToPaginate = shouldFilterClientSide
    ? getItemsFilteredBySearchQuery({
        items,
        fieldsToSearch,
        searchQuery,
      })
    : items;

  return {
    items: getCurrentPageItems(
      itemsToPaginate,
      tableOptions,
      sortItems,
      sortFn
    ),
    totalCount: itemsToPaginate.length,
  };
}

function getItemsFilteredBySearchQuery<T>({
  items,
  fieldsToSearch,
  searchQuery,
}: {
  items: T[];
  fieldsToSearch: Array<keyof T>;
  searchQuery: string;
}) {
  return items.filter((item) => {
    return fieldsToSearch.some((field) => {
      const fieldValue = item[field] as unknown as string | undefined;
      return fieldValue?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  });
}

function getCurrentPageItems<T>(
  items: T[],
  tableOptions: TableOptions<T>,
  sortItems: boolean,
  sortFn: SortFunction<T>
) {
  const sortedItems = sortItems
    ? sortFn(items, tableOptions.sort.field, tableOptions.sort.direction)
    : items;

  return sortedItems.slice(
    tableOptions.page.index * tableOptions.page.size,
    (tableOptions.page.index + 1) * tableOptions.page.size
  );
}

function defaultSortFn<T>(
  items: T[],
  sortField: keyof T,
  sortDirection: 'asc' | 'desc'
) {
  return orderBy(items, sortField, sortDirection) as T[];
}

export type SortFunction<T> = (
  items: T[],
  sortField: keyof T,
  sortDirection: 'asc' | 'desc'
) => T[];

type OnChangeSearchQuery = ({
  searchQuery,
  shouldFetchServer,
}: {
  searchQuery: string;
  shouldFetchServer: boolean;
}) => void;
