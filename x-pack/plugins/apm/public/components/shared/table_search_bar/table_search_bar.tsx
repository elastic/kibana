/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import { memoize, orderBy, pick } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { apmEnableTableSearchBar } from '@kbn/observability-plugin/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

const memoizeResult = memoize(
  <T, P extends keyof T>(page: CurrentPage<T>, fieldsToSearch: P[]) => page,
  <T, P extends keyof T>(page: CurrentPage<T>, fieldsToSearch: P[]) => {
    return (
      page.items.map((item) => pick(item, fieldsToSearch)).join('__') +
      `${page.totalCount}`
    );
  }
);

interface TableOptions<F extends string> {
  page: { index: number; size: number };
  sort: { direction: 'asc' | 'desc'; field: F };
}

export interface CurrentPage<T> {
  items: T[];
  totalCount: number;
}

export function TableSearchBar<T, P extends keyof T & string>(props: {
  items: T[];
  fieldsToSearch: P[];
  isServerSearchQueryActive: boolean;
  maxCountExceeded: boolean;
  onChangeCurrentPage: (page: CurrentPage<T>) => void;
  onChangeSearchQuery: OnChangeSearchQuery;
  placeholder: string;
  tableOptions: TableOptions<P>;
  isEnabled: boolean;
  sortItems?: boolean;
  sortFn?: SortFunction<T, P>;
}) {
  const {
    items,
    fieldsToSearch,
    isServerSearchQueryActive,
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
    const _currentPage = getCurrentPage({
      items,
      fieldsToSearch,
      maxCountExceeded,
      searchQuery,
      tableOptions,
      sortItems,
      sortFn,
    });

    if (_currentPage.items.includes((item) => item === null)) {
      console.log('PROBLEMOS!');
    }

    console.log({ _currentPage });

    return fieldsToSearch.length > 0 && isTableSearchBarEnabled
      ? memoizeResult(_currentPage, fieldsToSearch)
      : _currentPage;

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

  const MINIMUM_NUMBER_OF_ITEMS_FOR_SEARCH_BAR_TO_SHOW = 10;
  if (
    !isTableSearchBarEnabled ||
    !isEnabled ||
    (!isServerSearchQueryActive &&
      !searchQuery &&
      items.length < MINIMUM_NUMBER_OF_ITEMS_FOR_SEARCH_BAR_TO_SHOW)
  ) {
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
          maxCountExceeded ||
          (isServerSearchQueryActive && !e.target.value.includes(searchQuery));

        setSearchQuery(e.target.value);
        onChangeSearchQuery({ searchQuery: e.target.value, shouldFetchServer });
      }}
    />
  );
}

function getCurrentPage<T, P extends keyof T & string>({
  items,
  fieldsToSearch,
  maxCountExceeded,
  searchQuery,
  tableOptions,
  sortItems,
  sortFn,
}: {
  items: T[];
  fieldsToSearch: P[];
  maxCountExceeded: boolean;
  searchQuery?: string;
  tableOptions: TableOptions<P>;
  sortItems: boolean;
  sortFn: SortFunction<T, P>;
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

function getItemsFilteredBySearchQuery<T, P extends keyof T>({
  items,
  fieldsToSearch,
  searchQuery,
}: {
  items: T[];
  fieldsToSearch: P[];
  searchQuery: string;
}) {
  return items.filter((item) => {
    return fieldsToSearch.some((field) => {
      const fieldValue = item[field] as unknown as string | undefined;
      return fieldValue?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  });
}

function getCurrentPageItems<T, P extends keyof T & string>(
  items: T[],
  tableOptions: TableOptions<P>,
  sortItems: boolean,
  sortFn: SortFunction<T, P>
) {
  const sortedItems = sortItems
    ? sortFn(items, tableOptions.sort.field, tableOptions.sort.direction)
    : items;

  return sortedItems.slice(
    tableOptions.page.index * tableOptions.page.size,
    (tableOptions.page.index + 1) * tableOptions.page.size
  );
}

function defaultSortFn<T, P extends keyof T & string>(
  items: T[],
  sortField: P,
  sortDirection: 'asc' | 'desc'
) {
  return orderBy(items, sortField, sortDirection) as T[];
}

export type SortFunction<T, P extends keyof T & string> = (
  items: T[],
  sortField: P,
  sortDirection: 'asc' | 'desc'
) => T[];

type OnChangeSearchQuery = ({
  searchQuery,
  shouldFetchServer,
}: {
  searchQuery: string;
  shouldFetchServer: boolean;
}) => void;
