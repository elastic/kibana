/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { renderHook } from '@testing-library/react-hooks';
import { QueryParams } from '../components/all_inference_endpoints/types';
import { useTableData } from './use_table_data';
import { INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES } from '../components/all_inference_endpoints/types';

const inferenceEndpoints = [
  {
    model_id: 'my-elser-model-04',
    task_type: 'sparse_embedding',
    service: 'elser',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    model_id: 'my-elser-model-01',
    task_type: 'sparse_embedding',
    service: 'elser',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    model_id: 'my-elser-model-05',
    task_type: 'sparse_embedding',
    service: 'elser',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
] as InferenceAPIConfigResponse[];

const queryParams = {
  page: 1,
  perPage: 10,
  sortField: 'endpoint',
  sortOrder: 'desc',
} as QueryParams;

describe('useTableData', () => {
  it('should return correct pagination', () => {
    const { result } = renderHook(() => useTableData(inferenceEndpoints, queryParams));

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 10,
      pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
      totalItemCount: 3,
    });
  });

  it('should return correct sorting', () => {
    const { result } = renderHook(() => useTableData(inferenceEndpoints, queryParams));

    expect(result.current.sorting).toEqual({
      sort: {
        direction: 'desc',
        field: 'endpoint',
      },
    });
  });

  it('should return correctly sorted data', () => {
    const { result } = renderHook(() => useTableData(inferenceEndpoints, queryParams));

    const expectedSortedData = [...inferenceEndpoints].sort((a, b) =>
      b.model_id.localeCompare(a.model_id)
    );

    const sortedEndpoints = result.current.sortedTableData.map((item) => item.endpoint);
    const expectedModelIds = expectedSortedData.map((item) => item.model_id);

    expect(sortedEndpoints).toEqual(expectedModelIds);
  });
});
