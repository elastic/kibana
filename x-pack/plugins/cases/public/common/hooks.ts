/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { STACK_APP_ID } from '../../common/constants';
import { useCasesContext } from '../components/cases_context/use_cases_context';

import { useLocation, useHistory } from 'react-router-dom';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { parse, stringify } from 'query-string';

import { DEFAULT_QUERY_PARAMS } from '../containers/use_get_cases';

import type { LocalStorageQueryParams, QueryParams, UrlQueryParams } from '../../common/ui/types';

export const useIsMainApplication = () => {
  const { appId } = useCasesContext();

  return appId === STACK_APP_ID;
};

export function useUrlState() {
  const location = useLocation();
  const history = useHistory();

  const [queryParams, setQueryParams] = useState<QueryParams>(DEFAULT_QUERY_PARAMS);

  const [localStorageQueryParams, setLocalStorageQueryParams] =
    useLocalStorage<LocalStorageQueryParams>('all_cases.queryparams');

  const setUrlQueryParams = useCallback(
    (params) => {
      const urlParams: UrlQueryParams = parse(location.search);
      const newQueryParams: QueryParams = DEFAULT_QUERY_PARAMS;

      newQueryParams.perPage =
        params.perPage ?? urlParams.perPage ?? localStorageQueryParams?.perPage ?? DEFAULT_QUERY_PARAMS.perPage;
      newQueryParams.sortField =
        params.sortField ?? urlParams.sortField ?? localStorageQueryParams?.sortField ?? DEFAULT_QUERY_PARAMS.sortField;
      newQueryParams.sortOrder =
        params.sortOrder ?? urlParams.sortOrder ?? localStorageQueryParams?.sortOrder ?? DEFAULT_QUERY_PARAMS.sortOrder;
      newQueryParams.page = params.page ?? urlParams.page ?? DEFAULT_QUERY_PARAMS.page;

      if ( stringify(queryParams) !== stringify(newQueryParams) ) {

        const {page, ...localStorageQueryParams} = newQueryParams;

        setLocalStorageQueryParams(localStorageQueryParams);

        history.replace({
          ...location,
          search: stringify({
            ...urlParams,
            ...newQueryParams,
          }),
        });

        setQueryParams(newQueryParams);
      }

    },
    [history, localStorageQueryParams, location, setLocalStorageQueryParams]
  );

  useEffect(() => {
    setUrlQueryParams({});
  }, []);

  return {
    queryParams,
    setUrlQueryParams,
  };
}