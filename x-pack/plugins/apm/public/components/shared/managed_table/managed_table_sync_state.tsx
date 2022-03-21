/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CriteriaWithPagination } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import type { CommonProps } from './';
import { INITIAL_PAGE_SIZE, ManagedTable } from './';

interface Props<T> extends CommonProps<T> {
  onNavigate?: (options: CriteriaWithPagination<T>) => void;
}

export function ManagedTableSyncState<T>(props: Props<T>) {
  const {
    initialPageIndex = 0,
    initialPageSize = INITIAL_PAGE_SIZE,
    initialSortField = props.columns[0]?.field,
    initialSortDirection = 'asc',
    onNavigate,
    ...rest
  } = props;

  const [tableOptions, setTableOptions] = useState<CriteriaWithPagination<T>>({
    page: { index: initialPageIndex, size: initialPageSize },
    sort: {
      field: initialSortField as keyof T,
      direction: initialSortDirection,
    },
  });

  const onTableChange = useCallback(
    (options: CriteriaWithPagination<T>) => {
      setTableOptions(options);
      if (onNavigate) {
        onNavigate(options);
      }
    },
    [onNavigate]
  );

  return (
    <ManagedTable
      {...rest}
      page={tableOptions.page.index}
      pageSize={tableOptions.page.size}
      sortField={tableOptions.sort?.field}
      sortDirection={tableOptions.sort?.direction}
      onTableChange={onTableChange}
    />
  );
}
