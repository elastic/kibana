/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS: readonly number[] = [5, 20, 50];

export interface Pagination {
  currentPage: number;
  pageSize: number;
}

export function usePagination(
  pageInfo: Pagination = {
    currentPage: 1,
    pageSize: 20,
  }
) {
  const [pagination, setPagination] = useState<Pagination>(pageInfo);
  const pageSizeOptions = useMemo(() => [...PAGE_SIZE_OPTIONS], []);

  return {
    pagination,
    setPagination,
    pageSizeOptions,
  };
}
