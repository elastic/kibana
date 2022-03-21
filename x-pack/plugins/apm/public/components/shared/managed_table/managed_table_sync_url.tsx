/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CriteriaWithPagination } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from '../links/url_helpers';
import { CommonProps, INITIAL_PAGE_SIZE, ManagedTable } from './';

export function ManagedTableSyncUrl<T>(props: CommonProps<T>) {
  const history = useHistory();
  const {
    initialPageIndex = 0,
    initialPageSize = INITIAL_PAGE_SIZE,
    initialSortField = props.columns[0]?.field,
    initialSortDirection = 'asc',
    ...rest
  } = props;
  const {
    urlParams: {
      page = initialPageIndex,
      pageSize = initialPageSize,
      sortField = initialSortField,
      sortDirection = initialSortDirection,
    },
  } = useLegacyUrlParams();

  const onTableChange = useCallback(
    (options: CriteriaWithPagination<T>) => {
      history.push({
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          page: options.page.index,
          pageSize: options.page.size,
          sortField: options.sort?.field,
          sortDirection: options.sort?.direction,
        }),
      });
    },
    [history]
  );

  return (
    <ManagedTable
      {...rest}
      page={page}
      pageSize={pageSize}
      sortField={sortField as keyof T}
      sortDirection={sortDirection}
      onTableChange={onTableChange}
    />
  );
}
