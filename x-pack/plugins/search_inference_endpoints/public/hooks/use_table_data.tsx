/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableSortingType } from '@elastic/eui';
import { Pagination } from '@elastic/eui';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { useMemo } from 'react';
import { DEFAULT_TABLE_LIMIT } from '../components/all_inference_endpoints/constants';
import {
  InferenceEndpointUI,
  INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
  QueryParams,
  SortOrder,
} from '../components/all_inference_endpoints/types';

interface UseTableDataReturn {
  tableData: InferenceEndpointUI[];
  sortedTableData: InferenceEndpointUI[];
  paginatedSortedTableData: InferenceEndpointUI[];
  pagination: Pagination;
  sorting: EuiTableSortingType<InferenceEndpointUI>;
}

export const useTableData = (
  inferenceEndpoints: InferenceAPIConfigResponse[],
  queryParams: QueryParams
): UseTableDataReturn => {
  const tableData: InferenceEndpointUI[] = useMemo(() => {
    return inferenceEndpoints.map((endpoint) => ({
      endpoint: endpoint.model_id,
      provider: endpoint.service,
      type: endpoint.task_type,
    }));
  }, [inferenceEndpoints]);

  const sortedTableData: InferenceEndpointUI[] = useMemo(() => {
    return [...tableData].sort((a, b) => {
      const aValue = a[queryParams.sortField];
      const bValue = b[queryParams.sortField];

      if (queryParams.sortOrder === SortOrder.asc) {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [tableData, queryParams]);

  const pagination: Pagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
      totalItemCount: inferenceEndpoints.length ?? 0,
    }),
    [inferenceEndpoints, queryParams]
  );

  const paginatedSortedTableData: InferenceEndpointUI[] = useMemo(() => {
    const pageSize = pagination.pageSize || DEFAULT_TABLE_LIMIT;
    const startIndex = pagination.pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedTableData.slice(startIndex, endIndex);
  }, [sortedTableData, pagination]);

  const sorting = useMemo(
    () => ({
      sort: {
        direction: queryParams.sortOrder,
        field: queryParams.sortField,
      },
    }),
    [queryParams.sortField, queryParams.sortOrder]
  );

  return { tableData, sortedTableData, paginatedSortedTableData, pagination, sorting };
};
