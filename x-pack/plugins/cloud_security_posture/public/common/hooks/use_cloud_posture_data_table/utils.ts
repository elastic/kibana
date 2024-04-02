/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableProps, Pagination } from '@elastic/eui';

type TablePagination = NonNullable<EuiBasicTableProps<object>['pagination']>;

export const getPaginationTableParams = (
  params: TablePagination & Pick<Required<TablePagination>, 'pageIndex' | 'pageSize'>,
  pageSizeOptions = [10, 25, 100],
  showPerPageOptions = true
): Required<TablePagination> => ({
  ...params,
  pageSizeOptions,
  showPerPageOptions,
});

export const getPaginationQuery = ({
  pageIndex,
  pageSize,
}: Required<Pick<Pagination, 'pageIndex' | 'pageSize'>>) => ({
  from: pageIndex * pageSize,
  size: pageSize,
});

export const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: { field: '@timestamp', direction: 'desc' },
  pageIndex: 0,
});
