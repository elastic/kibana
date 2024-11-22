/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import type {
  QueryParams,
  AllInferenceEndpointsTableState,
  FilterOptions,
} from '../components/all_inference_endpoints/types';

import { DEFAULT_INFERENCE_ENDPOINTS_TABLE_STATE } from '../components/all_inference_endpoints/constants';

interface UseAllInferenceEndpointsStateReturn {
  queryParams: QueryParams;
  setQueryParams: (queryParam: Partial<QueryParams>) => void;
  filterOptions: FilterOptions;
  setFilterOptions: (filterOptions: Partial<FilterOptions>) => void;
}

export function useAllInferenceEndpointsState(): UseAllInferenceEndpointsStateReturn {
  const [tableState, setTableState] = useState<AllInferenceEndpointsTableState>(
    DEFAULT_INFERENCE_ENDPOINTS_TABLE_STATE
  );
  const setState = useCallback((state: AllInferenceEndpointsTableState) => {
    setTableState(state);
  }, []);

  return {
    queryParams: {
      ...DEFAULT_INFERENCE_ENDPOINTS_TABLE_STATE.queryParams,
      ...tableState.queryParams,
    },
    setQueryParams: (newQueryParams: Partial<QueryParams>) => {
      setState({
        filterOptions: tableState.filterOptions,
        queryParams: { ...tableState.queryParams, ...newQueryParams },
      });
    },
    filterOptions: {
      ...DEFAULT_INFERENCE_ENDPOINTS_TABLE_STATE.filterOptions,
      ...tableState.filterOptions,
    },
    setFilterOptions: (newFilterOptions: Partial<FilterOptions>) => {
      setState({
        filterOptions: { ...tableState.filterOptions, ...newFilterOptions },
        queryParams: tableState.queryParams,
      });
    },
  };
}
