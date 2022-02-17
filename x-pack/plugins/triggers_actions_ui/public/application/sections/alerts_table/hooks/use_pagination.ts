/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';

export function usePagination(pageIndex: number = 0, pageSize: number = 10) {
  const [pagination, setPagination] = useState({ pageIndex, pageSize });
  const onChangeItemsPerPage = useCallback(
    (_pageSize) =>
      setPagination((state) => ({
        ...state,
        pageSize: _pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (_pageIndex) => setPagination((state) => ({ ...state, pageIndex: _pageIndex })),
    [setPagination]
  );
  return { pagination, onChangeItemsPerPage, onChangePage };
}
