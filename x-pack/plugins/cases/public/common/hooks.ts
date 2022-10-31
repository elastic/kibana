/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { useLocation, useHistory } from 'react-router-dom';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { parse, stringify } from 'query-string';
import { STACK_APP_ID } from '../../common/constants';
import { useCasesContext } from '../components/cases_context/use_cases_context';

import { DEFAULT_QUERY_PARAMS } from '../containers/use_get_cases';

import type {
  LocalStorageQueryParams,
  QueryParams,
  ParsedUrlQueryParams,
  UrlQueryParams,
} from '../../common/ui/types';

const parseUrlQueryParams = (search: string): UrlQueryParams => {
  const parsedUrlParams: ParsedUrlQueryParams = parse(search);

  const urlParams: UrlQueryParams = {
    ...(parsedUrlParams.sortField && { sortField: parsedUrlParams.sortField }),
    ...(parsedUrlParams.sortOrder && { sortOrder: parsedUrlParams.sortOrder }),
  };

  const intPage = parsedUrlParams.page && parseInt(parsedUrlParams.page, 10);
  const intPerPage = parsedUrlParams.perPage && parseInt(parsedUrlParams.perPage, 10);

  if (intPage) {
    urlParams.page = intPage;
  }

  if (intPerPage) {
    urlParams.perPage = intPerPage;
  }

  return urlParams;
};

export const useIsMainApplication = () => {
  const { appId } = useCasesContext();

  return appId === STACK_APP_ID;
};

export function useUrlState() {
  const location = useLocation();
  const history = useHistory();

  const [queryParams, setQueryParams] = useState<UrlQueryParams>({});

  const [localStorageQueryParams, setLocalStorageQueryParams] =
    useLocalStorage<LocalStorageQueryParams>('cases.list.preferences');

  const setUrlQueryParams = useCallback(
    (params) => {
      const urlParams: UrlQueryParams = parseUrlQueryParams(location.search);
      const newQueryParams: QueryParams = { ...DEFAULT_QUERY_PARAMS };

      newQueryParams.perPage =
        params.perPage ??
        urlParams.perPage ??
        localStorageQueryParams?.perPage ??
        DEFAULT_QUERY_PARAMS.perPage;
      newQueryParams.sortField =
        params.sortField ??
        urlParams.sortField ??
        localStorageQueryParams?.sortField ??
        DEFAULT_QUERY_PARAMS.sortField;
      newQueryParams.sortOrder =
        params.sortOrder ??
        urlParams.sortOrder ??
        localStorageQueryParams?.sortOrder ??
        DEFAULT_QUERY_PARAMS.sortOrder;
      newQueryParams.page = params.page ?? urlParams.page ?? DEFAULT_QUERY_PARAMS.page;

      if (stringify(queryParams) !== stringify(newQueryParams)) {
        const { page, ...newLocalStorageQueryParams } = newQueryParams;

        setLocalStorageQueryParams(newLocalStorageQueryParams);

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
    [history, localStorageQueryParams, location, setLocalStorageQueryParams, queryParams]
  );

  useEffect(() => {
    setUrlQueryParams({});

    return () => {
      const currentUrlParams = parse(location.search);
      const { page, perPage, sortField, sortOrder, ...oldUrlParams } = currentUrlParams;

      history.replace({ search: stringify(oldUrlParams) });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    queryParams,
    setUrlQueryParams,
  };
}
