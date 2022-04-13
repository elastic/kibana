/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { EuiTableSortingType } from '@elastic/eui';
import { euiTableStorageGetter, euiTableStorageSetter } from '../../components/table';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { EUI_SORT_ASCENDING } from '../../../common/constants';

interface Pagination {
  pageSize: number;
  initialPageSize: number;
  pageIndex: number;
  initialPageIndex: number;
  pageSizeOptions: number[];
  totalItemCount: number;
}

interface Page {
  size: number;
  index: number;
}

type Sorting = EuiTableSortingType<string>;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const DEFAULT_PAGINATION = {
  pageSize: 20,
  initialPageSize: 20,
  pageIndex: 0,
  initialPageIndex: 0,
  pageSizeOptions: PAGE_SIZE_OPTIONS,
  totalItemCount: 0,
};

const getPaginationInitialState = (page: Page | undefined) => {
  const pagination = DEFAULT_PAGINATION;

  if (page) {
    pagination.initialPageSize = page.size;
    pagination.pageSize = page.size;
    pagination.initialPageIndex = page.index;
    pagination.pageIndex = page.index;
  }

  return {
    ...pagination,
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

  const updateTotalItemCount = useCallback(
    (num) => {
      // only update pagination state if different
      if (num === pagination.totalItemCount) return;
      setPagination({
        ...pagination,
        totalItemCount: num,
      });
    },
    [setPagination, pagination]
  );

  // get initial state from localStorage
  const [sorting, setSorting] = useState<Sorting>(
    storageData.sort || { sort: { field: 'name', direction: EUI_SORT_ASCENDING } }
  );

  const [query, setQuery] = useState('');

  const onTableChange = ({
    page,
    sort,
    queryText,
  }: {
    page: Page;
    sort: Sorting['sort'];
    queryText: string;
  }) => {
    setPagination({
      ...pagination,
      ...{
        initialPageSize: page.size,
        pageSize: page.size,
        initialPageIndex: page.index,
        pageIndex: page.index,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
      },
    });
    setSorting({ sort });
    setLocalStorageData(storage, {
      page,
      sort: {
        sort,
      },
    });
    setQuery(queryText);
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
      queryText: query,
    };
  }, [pagination, query, sorting]);

  const getPaginationTableProps = () => {
    return {
      sorting,
      pagination,
      onTableChange,
    };
  };

  return {
    getPaginationRouteOptions,
    getPaginationTableProps,
    updateTotalItemCount,
  };
}
