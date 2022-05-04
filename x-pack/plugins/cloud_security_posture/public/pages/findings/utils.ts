/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { DataView, EsQuerySortValue } from '@kbn/data-plugin/common';
import { Criteria, EuiBasicTableProps } from '@elastic/eui';
import { SortDirection } from '@kbn/data-plugin/common';
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

export const getEuiSortFromEs = <T extends unknown>(
  sort: EsQuerySortValue[]
): EuiBasicTableProps<T>['sorting'] => {
  if (!sort.length) return;

  const entry = Object.entries(sort[0])?.[0];
  if (!entry) return;

  const [field, direction] = entry;
  return { sort: { field: field as keyof T, direction: direction as SortDirection } };
};

export const getEsSortFromEui = <T extends unknown>(
  sort: Criteria<T>['sort']
): EsQuerySortValue[] | undefined =>
  sort ? [{ [sort.field]: sort.direction as SortDirection }] : undefined;

export const getEuiPaginationFromEs = <T extends unknown>({
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

export const getEsPaginationFromEui = (page: Criteria<any>['page']) => ({
  ...(!!page && { from: page.index * page.size, size: page.size }),
});
