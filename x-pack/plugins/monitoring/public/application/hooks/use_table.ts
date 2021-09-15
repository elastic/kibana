/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { EUI_SORT_ASCENDING } from '../../../common/constants';
import { euiTableStorageGetter, euiTableStorageSetter } from '../../components/table';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const DEFAULT_PAGINATION = {
  pageSize: 20,
  initialPageSize: 20,
  pageIndex: 0,
  initialPageIndex: 0,
  pageSizeOptions: PAGE_SIZE_OPTIONS,
};

const verifyDataFromLocalStorage = (page) => {
  if (!PAGE_SIZE_OPTIONS.includes(page.size)) {
    page.size = 20;
  }

  return page;
};

export function useTable(storageKey) {
  const storage = new Storage(window.localStorage);
  const getLocalStorageData = euiTableStorageGetter(storageKey);
  const setLocalStorageData = euiTableStorageSetter(storageKey);

  const storageData = getLocalStorageData(storage);
  // get initial state from localstorage
  const [pagination, setPagination] = useState(
    page ? verifyDataFromLocalStorage(storageData.page) : DEFAULT_PAGINATION
  );

  // get initial state from localStorage
  const [sorting, setSorting] = useState({});
  const cleanSortingData = (sortData) => {
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

  const onTableChange = ({ page, sort }) => {
    // we are already updating the state in fetchMoreData. We would need to check in react
    // if both methods are needed or we can clean one of them
    // TODO: check if we need this
    // if (this.onTableChangeRender) {
    //   this.onTableChangeRender();
    // }
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
      fetchMoreData: async ({ page, sort, query }) => {
        setPagination({
          initialPageSize: page.size,
          pageSize: page.size,
          initialPageIndex: page.index,
          pageIndex: page.index,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        });
        setSorting(cleanSortingData(sort));
        setQueryText(query);
      },
    };
  };

  return {
    getPaginationRouteOptions,
    getPaginationTableProps,
  };
}
