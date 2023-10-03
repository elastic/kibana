/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetchAlerts } from './use_fetch_alerts';
import { usePagination, useSorting } from './use_pagination_and_sorting';

/**
 * Adds pagination and sorting state to useFetchAlerts. It is used in alerts table local to correlation details
 */
export const usePaginatedAlerts = (alertIds: string[]) => {
  const { setPagination, pagination, pageSizeOptions } = usePagination();
  const { sorting, sortConfig, setSorting } = useSorting();

  const { data, totalItemCount, loading, error } = useFetchAlerts({
    alertIds,
    from: pagination.pageIndex * pagination.pageSize,
    size: pagination.pageSize,
    sort: sortConfig,
  });

  const paginationConfig = useMemo(() => {
    return {
      ...pagination,
      pageSizeOptions,
      totalItemCount,
    };
  }, [pageSizeOptions, pagination, totalItemCount]);

  return {
    paginationConfig,
    setPagination,
    setSorting,
    loading,
    data,
    sorting,
    error,
  };
};
