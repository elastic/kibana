/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';
import type { EuiBasicTableProps } from '@elastic/eui';
import type { FindingsBaseEsQuery, FindingsBaseURLQuery } from './types';

export const getBaseQuery = ({
  dataView,
  query,
  filters,
}: FindingsBaseURLQuery & { dataView: DataView }): FindingsBaseEsQuery => ({
  index: dataView.title,
  // TODO: this will throw for malformed query
  // page will display an error boundary with the JS error
  // will be accounted for before releasing the feature
  query: buildEsQuery(dataView, query, filters),
});

export const getEuiPaginationFromEsSearchSource = <T extends unknown>({
  from: pageIndex,
  size: pageSize,
  total,
}: {
  total?: number | undefined;
  size: number;
  from: number;
}): EuiBasicTableProps<T>['pagination'] => ({
  pageSize,
  pageIndex: Math.ceil(pageIndex / pageSize),
  totalItemCount: total || 0,
  pageSizeOptions: [10, 25, 100],
  showPerPageOptions: true,
});
