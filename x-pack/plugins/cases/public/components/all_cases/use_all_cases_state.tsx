/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { isEqual } from 'lodash';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { parse, stringify } from 'query-string';

import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../containers/use_get_cases';
import { parseUrlQueryParams } from './utils';
import { LOCAL_STORAGE_KEYS } from '../../../common/constants';

import type {
  FilterOptions,
  PartialFilterOptions,
  LocalStorageQueryParams,
  ParsedUrlQueryParams,
  QueryParams,
  UrlQueryParams,
} from '../../../common/ui/types';
import { useCasesContext } from '../cases_context/use_cases_context';

export const getQueryParamsLocalStorageKey = (appId: string) => {
  const filteringKey = LOCAL_STORAGE_KEYS.casesQueryParams;
  return `${appId}.${filteringKey}`;
};

export const getFilterOptionsLocalStorageKey = (appId: string) => {
  const filteringKey = LOCAL_STORAGE_KEYS.casesFilterOptions;
  return `${appId}.${filteringKey}`;
};

const getQueryParams = (
  params: UrlQueryParams,
  queryParams: UrlQueryParams,
  urlParams: UrlQueryParams,
  localStorageQueryParams?: LocalStorageQueryParams
): QueryParams => {
  const result = { ...DEFAULT_QUERY_PARAMS };

  result.perPage =
    params.perPage ??
    urlParams.perPage ??
    localStorageQueryParams?.perPage ??
    DEFAULT_QUERY_PARAMS.perPage;

  result.sortField =
    params.sortField ??
    urlParams.sortField ??
    localStorageQueryParams?.sortField ??
    DEFAULT_QUERY_PARAMS.sortField;

  result.sortOrder =
    params.sortOrder ??
    urlParams.sortOrder ??
    localStorageQueryParams?.sortOrder ??
    DEFAULT_QUERY_PARAMS.sortOrder;

  result.page = params.page ?? urlParams.page ?? DEFAULT_QUERY_PARAMS.page;

  return result;
};

const getFilterOptions = (
  filterOptions: FilterOptions,
  params: FilterOptions,
  localStorageFilterOptions?: PartialFilterOptions
): FilterOptions => {
  const severity = params.severity ?? localStorageFilterOptions?.severity;
  const status = params.status ?? localStorageFilterOptions?.status;
  // const tags = params.tags ?? localStorageFilterOptions?.tags;

  return {
    ...filterOptions,
    ...params,
    ...(severity && { severity }),
    ...(status && { status }),
    // ...(tags && { tags }),
  };
};

export function useAllCasesState(
  isModalView: boolean = false,
  initialFilterOptions?: PartialFilterOptions
) {
  const { appId } = useCasesContext();
  const location = useLocation();
  const history = useHistory();
  const isFirstRenderRef = useRef(true);

  const [queryParams, setQueryParams] = useState<QueryParams>({ ...DEFAULT_QUERY_PARAMS });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    ...DEFAULT_FILTER_OPTIONS,
    ...initialFilterOptions,
  });

  const [localStorageQueryParams, setLocalStorageQueryParams] =
    useLocalStorage<LocalStorageQueryParams>(getQueryParamsLocalStorageKey(appId));

  const [localStorageFilterOptions, setLocalStorageFilterOptions] =
    useLocalStorage<PartialFilterOptions>(getFilterOptionsLocalStorageKey(appId));

  const persistAndUpdateQueryParams = useCallback(
    (params) => {
      if (isModalView) {
        setQueryParams((prevParams) => ({ ...prevParams, ...params }));
        return;
      }

      const parsedUrlParams: ParsedUrlQueryParams = parse(location.search);
      const urlParams: UrlQueryParams = parseUrlQueryParams(parsedUrlParams);
      const newQueryParams: QueryParams = getQueryParams(
        params,
        queryParams,
        urlParams,
        localStorageQueryParams
      );
      const newLocalStorageQueryParams = {
        perPage: newQueryParams.perPage,
        sortField: newQueryParams.sortField,
        sortOrder: newQueryParams.sortOrder,
      };
      const newUrlParams = {
        page: newQueryParams.page,
        ...newLocalStorageQueryParams,
      };

      if (!isEqual(newUrlParams, urlParams)) {
        try {
          const newHistory = {
            ...location,
            search: stringify({ ...parsedUrlParams, ...newUrlParams }),
          };

          if (isFirstRenderRef.current) {
            history.replace(newHistory);
          } else {
            history.push(newHistory);
          }
        } catch {
          // silently fail
        }
      }

      setLocalStorageQueryParams(newLocalStorageQueryParams);
      setQueryParams(newQueryParams);
    },
    [
      isModalView,
      location,
      localStorageQueryParams,
      queryParams,
      setLocalStorageQueryParams,
      history,
    ]
  );

  const persistAndUpdateFilterOptions = useCallback(
    (params) => {
      if (isModalView) {
        setFilterOptions((prevParams) => ({ ...prevParams, ...params }));
        return;
      }

      const newFilterOptions: FilterOptions = getFilterOptions(
        filterOptions,
        params,
        localStorageFilterOptions
      );
      const newLocalStorageFilterOptions = {
        ...localStorageFilterOptions,
        ...(newFilterOptions.severity && { severity: newFilterOptions.severity }),
        ...(newFilterOptions.status && { status: newFilterOptions.status }),
      };

      setLocalStorageFilterOptions(newLocalStorageFilterOptions);
      setFilterOptions(newFilterOptions);
    },
    [isModalView, filterOptions, localStorageFilterOptions, setLocalStorageFilterOptions]
  );

  useEffect(() => {
    if (isFirstRenderRef.current) {
      persistAndUpdateQueryParams(isModalView ? DEFAULT_QUERY_PARAMS : {});
      persistAndUpdateFilterOptions(isModalView ? DEFAULT_QUERY_PARAMS : {});
      isFirstRenderRef.current = false;
    }
  }, [isModalView, persistAndUpdateFilterOptions, persistAndUpdateQueryParams]);

  return {
    queryParams,
    setQueryParams: persistAndUpdateQueryParams,
    filterOptions,
    setFilterOptions: persistAndUpdateFilterOptions,
  };
}
