/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { EUI_SORT_ASCENDING } from '../../../common/constants';
import { euiTableStorageGetter, euiTableStorageSetter } from '../../components/table';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';

interface Pagination {
  pageSize: number;
  initialPageSize: number;
  pageIndex: number;
  initialPageIndex: number;
  pageSizeOptions: number[];
}

interface Page {
  size: number;
  index: number;
}

interface Sorting {
  sort: {
    field: string;
    direction: string;
  };
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const DEFAULT_PAGINATION = {
  pageSize: 20,
  initialPageSize: 20,
  pageIndex: 0,
  initialPageIndex: 0,
  pageSizeOptions: PAGE_SIZE_OPTIONS,
};

const getPaginationInitialState = (page: Page | undefined) => {
  if (!page) {
    return DEFAULT_PAGINATION;
  }

  if (!PAGE_SIZE_OPTIONS.includes(page.size)) {
    page.size = 20;
  }

  return {
    initialPageSize: page.size,
    pageSize: page.size,
    initialPageIndex: page.index,
    pageIndex: page.index,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };
};

export function useTable(storageKey: string) {
  const storage = new Storage(window.localStorage);
  const getLocalStorageData = euiTableStorageGetter(storageKey);
  const setLocalStorageData = euiTableStorageSetter(storageKey);

  const storageData = getLocalStorageData(storage);
  // get initial state from localstorage
  const [pagination, setPagination] = useState<Pagination>(
    getPaginationInitialState(storageData.page)
  );

  // get initial state from localStorage
  const [sorting, setSorting] = useState<Sorting>(storageData.sort || { sort: {} });
  const cleanSortingData = (sortData: Sorting) => {
    const sort = sortData || { sort: {} };

    if (!sort.sort.field) {
      sort.sort.field = 'name';
    }
    if (!sort.sort.direction) {
      sort.sort.direction = EUI_SORT_ASCENDING;
    }

    return sort;
  };

  const [queryText, setQueryText] = useState('');

  const onTableChange = () => {
    // we are already updating the state in fetchMoreData. We would need to check in react
    // if both methods are needed or we can clean one of them
    // For now I just keep it so existing react components don't break
  };

  const getPaginationRouteOptions = useCallback(() => {
    if (!pagination || !sorting) {
      return {};
    }

    return {
      pagination: {
        size: pagination.pageSize,
        index: pagination.pageIndex,
      },
      ...sorting,
      queryText,
    };
  }, [pagination, queryText, sorting]);

  const getPaginationTableProps = () => {
    return {
      sorting,
      pagination,
      onTableChange,
      fetchMoreData: async ({
        page,
        sort,
        query,
      }: {
        page: Page;
        sort: Sorting;
        query: string;
      }) => {
        setPagination({
          initialPageSize: page.size,
          pageSize: page.size,
          initialPageIndex: page.index,
          pageIndex: page.index,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        });
        setSorting(cleanSortingData(sort));
        setQueryText(query);

        setLocalStorageData(storage, {
          page,
          sort,
        });
      },
    };
  };

  return {
    getPaginationRouteOptions,
    getPaginationTableProps,
  };
}
