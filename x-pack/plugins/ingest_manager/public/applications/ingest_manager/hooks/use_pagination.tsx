/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

export interface Pagination {
  currentPage: number;
  pageSize: number;
}

export function usePagination() {
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    pageSize: 20,
  });

  return {
    pagination,
    setPagination,
    pageSizeOptions: 20,
  };
}
