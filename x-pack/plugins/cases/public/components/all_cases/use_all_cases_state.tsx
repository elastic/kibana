/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';

import type { FilterOptions, PartialFilterOptions, QueryParams } from '../../../common/ui/types';

import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../containers/constants';
import { LOCAL_STORAGE_KEYS } from '../../../common/constants';
import type { AllCasesTableState, AllCasesURLState } from './types';
import { stringifyUrlParams } from './utils/stringify_url_params';
import { allCasesUrlStateDeserializer } from './utils/all_cases_url_state_deserializer';
import { allCasesUrlStateSerializer } from './utils/all_cases_url_state_serializer';
import { parseUrlParams } from './utils/parse_url_params';

export const getQueryParamsLocalStorageKey = (appId: string) => {
  const filteringKey = LOCAL_STORAGE_KEYS.casesQueryParams;
  return `${appId}.${filteringKey}`;
};

export const getFilterOptionsLocalStorageKey = (appId: string) => {
  const filteringKey = LOCAL_STORAGE_KEYS.casesFilterOptions;
  return `${appId}.${filteringKey}`;
};

interface UseAllCasesStateReturn {
  filterOptions: FilterOptions;
  setQueryParams: (queryParam: QueryParams) => void;
  setFilterOptions: (filterOptions: FilterOptions) => void;
  queryParams: QueryParams;
}

export function useAllCasesState(
  isModalView: boolean = false,
  initialFilterOptions?: PartialFilterOptions
): UseAllCasesStateReturn {
  // TODO: Handle initial filters
  // TODO: Use React state to handle modal that do not support filters
  const [urlState, setUrlState] = useAllCasesUrlState();

  const setState = useCallback(
    (state: AllCasesTableState) => {
      setUrlState(state);
    },
    [setUrlState]
  );

  return {
    queryParams: { ...DEFAULT_QUERY_PARAMS, ...urlState.queryParams },
    setQueryParams: (newQueryParams: QueryParams) => {
      // TODO: Set only the new changes and not the defaults by removing empty values
      setState({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS, ...urlState.filterOptions },
        queryParams: newQueryParams,
      });
    },
    filterOptions: { ...DEFAULT_FILTER_OPTIONS, ...urlState.filterOptions },
    setFilterOptions: (newFilterOptions: FilterOptions) => {
      // TODO: Set only the new changes and not the defaults by removing empty values
      setState({
        filterOptions: newFilterOptions,
        queryParams: { ...DEFAULT_QUERY_PARAMS, ...urlState.queryParams },
      });
    },
  };
}

const useAllCasesUrlState = (): [AllCasesURLState, (updated: AllCasesTableState) => void] => {
  const history = useHistory();
  const { search } = useLocation();
  const [urlState, setUrlState] = useState<AllCasesURLState>({
    queryParams: {},
    filterOptions: {},
  });

  const urlParams = useMemo(
    () => parseUrlParams(new URLSearchParams(decodeURIComponent(search))),
    [search]
  );

  const parsedUrlParams = useMemo(() => allCasesUrlStateDeserializer(urlParams), [urlParams]);

  const updateQueryParams = useCallback(
    (updated: AllCasesTableState) => {
      const updatedQuery = allCasesUrlStateSerializer(updated);

      // TODO: Change with useAllCasesNavigate??
      history.push({
        // TODO: Change with encodeUriQuery?
        // src/plugins/kibana_utils/common/url/encode_uri_query.ts
        search: encodeURIComponent(stringifyUrlParams(updatedQuery)),
      });
    },
    [history]
  );

  useEffect(() => {
    setUrlState(parsedUrlParams);
  }, [parsedUrlParams]);

  return [urlState, updateQueryParams];
};
