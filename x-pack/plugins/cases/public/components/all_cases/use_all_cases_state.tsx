/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
  QueryParams,
  PartialQueryParams,
  ParsedUrlQueryParams,
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
  params: PartialQueryParams,
  urlParams: PartialQueryParams,
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
  urlParams: PartialFilterOptions,
  localStorageFilterOptions?: PartialFilterOptions
): FilterOptions => {
  const severity =
    params?.severity ??
    urlParams?.severity ??
    localStorageFilterOptions?.severity ??
    DEFAULT_FILTER_OPTIONS.severity;
  const status =
    params?.status ??
    urlParams?.status ??
    localStorageFilterOptions?.status ??
    DEFAULT_FILTER_OPTIONS.status;

  return {
    ...filterOptions,
    ...params,
    severity,
    status,
  };
};

const getSupportedFilterOptions = (filterOptions: PartialFilterOptions): PartialFilterOptions => {
  return {
    ...(filterOptions.severity && { severity: filterOptions.severity }),
    ...(filterOptions.status && { status: filterOptions.status }),
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
      const urlParams: PartialQueryParams = parseUrlQueryParams(parsedUrlParams);
      const newQueryParams: QueryParams = getQueryParams(
        params,
        urlParams,
        localStorageQueryParams
      );
      const newLocalStorageQueryParams = {
        perPage: newQueryParams.perPage,
        sortField: newQueryParams.sortField,
        sortOrder: newQueryParams.sortOrder,
      };
      setLocalStorageQueryParams(newLocalStorageQueryParams);
      setQueryParams(newQueryParams);
    },
    [isModalView, location.search, localStorageQueryParams, setLocalStorageQueryParams]
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
        parse(location.search),
        localStorageFilterOptions
      );

      const newPersistedFilterOptions: PartialFilterOptions =
        getSupportedFilterOptions(newFilterOptions);

      const newLocalStorageFilterOptions: PartialFilterOptions = {
        ...localStorageFilterOptions,
        ...newPersistedFilterOptions,
      };
      setLocalStorageFilterOptions(newLocalStorageFilterOptions);
      setFilterOptions(newFilterOptions);
    },
    [
      filterOptions,
      isModalView,
      localStorageFilterOptions,
      location.search,
      setLocalStorageFilterOptions,
    ]
  );

  const updateLocation = useCallback(() => {
    const parsedUrlParams = parse(location.search);
    const stateUrlParams = {
      ...parsedUrlParams,
      ...queryParams,
      ...getSupportedFilterOptions(filterOptions),
      page: queryParams.page.toString(),
      perPage: queryParams.perPage.toString(),
    };

    if (!isEqual(parsedUrlParams, stateUrlParams)) {
      try {
        const newHistory = {
          ...location,
          search: stringify({ ...parsedUrlParams, ...stateUrlParams }),
        };
        history.replace(newHistory);
      } catch {
        // silently fail
      }
    }
  }, [filterOptions, history, location, queryParams]);

  if (isFirstRenderRef.current) {
    persistAndUpdateQueryParams(isModalView ? queryParams : {});
    persistAndUpdateFilterOptions(isModalView ? filterOptions : initialFilterOptions);

    isFirstRenderRef.current = false;
  }

  useEffect(() => {
    if (!isModalView) {
      updateLocation();
    }
  }, [isModalView, updateLocation]);

  return {
    queryParams,
    setQueryParams: persistAndUpdateQueryParams,
    filterOptions,
    setFilterOptions: persistAndUpdateFilterOptions,
  };
}
