/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import { useEffect, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

/**
 * Client side pagination of the rows of a table. `items` has to keep its identity while the data
 * does not change: a new array sends the table back to the first page.
 */
export function useTablePagination<T extends object>(items: T[]) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPageIndex(0);
  }, [items]);

  return {
    pageItems: items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    pagination: {
      pageIndex,
      pageSize,
      totalItemCount: items.length,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    },
    onTableChange: ({ page }: CriteriaWithPagination<T>) => {
      setPageIndex(page.index);
      setPageSize(page.size);
    },
  };
}
