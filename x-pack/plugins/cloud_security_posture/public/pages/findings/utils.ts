/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import { EuiBasicTableProps, Pagination } from '@elastic/eui';
import { FindingsBaseProps } from './types';
import type { FindingsBaseEsQuery, FindingsBaseURLQuery } from './types';

export const getBaseQuery = ({
  dataView,
  query,
  filters,
}: FindingsBaseURLQuery & FindingsBaseProps): FindingsBaseEsQuery => ({
  // TODO: this will throw for malformed query
  // page will display an error boundary with the JS error
  // will be accounted for before releasing the feature
  query: buildEsQuery(dataView, query, filters),
});

type TablePagination = NonNullable<EuiBasicTableProps<unknown>['pagination']>;

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
}: Pick<Pagination, 'pageIndex' | 'pageSize'>) => ({
  from: pageIndex * pageSize,
  size: pageSize,
});
