/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import deepEqual from 'react-fast-compare';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { isEmpty } from 'lodash';

import type { FilterOptions, PartialFilterOptions, QueryParams } from '../../../common/ui/types';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../containers/constants';
import { LOCAL_STORAGE_KEYS } from '../../../common/constants';
import type { AllCasesTableState, AllCasesURLState } from './types';
import { stringifyUrlParams } from './utils/stringify_url_params';
import { allCasesUrlStateDeserializer } from './utils/all_cases_url_state_deserializer';
import { allCasesUrlStateSerializer } from './utils/all_cases_url_state_serializer';
import { parseUrlParams } from './utils/parse_url_params';
import { useCasesContext } from '../cases_context/use_cases_context';

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
  const [localStorageState, setLocalStorageState] = useAllCasesLocalStorage();

  const allCasesTableState: AllCasesTableState = useMemo(
    () => getAllCasesTableState(urlState, localStorageState),
    [localStorageState, urlState]
  );

  const setState = useCallback(
    (state: AllCasesTableState) => {
      if (!deepEqual(state, urlState)) {
        setUrlState(state);
      }

      if (!deepEqual(state, localStorageState)) {
        setLocalStorageState(state);
      }
    },
    [localStorageState, urlState, setLocalStorageState, setUrlState]
  );

  return {
    ...allCasesTableState,
    setQueryParams: (newQueryParams: QueryParams) => {
      // TODO: Set only the new changes and not the defaults by removing empty values
      setState({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS, ...urlState.filterOptions },
        queryParams: newQueryParams,
      });
    },
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

  if (!deepEqual(parsedUrlParams, urlState)) {
    setUrlState(parsedUrlParams);
  }

  return [urlState, updateQueryParams];
};

const getAllCasesTableState = (
  urlState: AllCasesURLState,
  localStorageState?: AllCasesTableState
): AllCasesTableState => {
  if (isURLStateEmpty(urlState)) {
    return {
      // TODO: Combine defaults to DEFAULT_CASES_TABLE_STATE
      queryParams: { ...DEFAULT_QUERY_PARAMS, ...localStorageState?.queryParams },
      filterOptions: { ...DEFAULT_FILTER_OPTIONS, ...localStorageState?.filterOptions },
    };
  }

  return {
    // TODO: Combine defaults to DEFAULT_CASES_TABLE_STATE
    queryParams: { ...DEFAULT_QUERY_PARAMS, ...urlState.queryParams },
    filterOptions: { ...DEFAULT_FILTER_OPTIONS, ...urlState.filterOptions },
  };
};

const isURLStateEmpty = (urlState: AllCasesURLState) => {
  if (isEmpty(urlState)) {
    return true;
  }

  if (isEmpty(urlState.filterOptions) && isEmpty(urlState.queryParams)) {
    return true;
  }

  return false;
};

const useAllCasesLocalStorage = (): [
  AllCasesTableState | undefined,
  Dispatch<SetStateAction<AllCasesTableState | undefined>>
] => {
  const { appId } = useCasesContext();

  const [state, setState] = useLocalStorage<AllCasesTableState>(
    getQueryParamsLocalStorageKey(appId),
    { queryParams: DEFAULT_QUERY_PARAMS, filterOptions: DEFAULT_FILTER_OPTIONS }
  );

  return [state, setState];
};

const getQueryParamsLocalStorageKey = (appId: string) => {
  const key = LOCAL_STORAGE_KEYS.casesTableState;
  return `${appId}.${key}`;
};
