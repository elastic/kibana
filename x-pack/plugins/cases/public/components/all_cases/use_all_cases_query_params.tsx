/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { isEqual } from 'lodash';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { stringify } from 'query-string';

import { DEFAULT_QUERY_PARAMS } from '../../containers/use_get_cases';
import { parseUrlQueryParams } from './utils';

import type {
  LocalStorageQueryParams,
  QueryParams,
  UrlQueryParams,
} from '../../../common/ui/types';

const getQueryParams = (
  params: UrlQueryParams,
  queryParams: UrlQueryParams,
  urlParams: UrlQueryParams,
  localStorageQueryParams?: LocalStorageQueryParams
) => {
  const result = { ...DEFAULT_QUERY_PARAMS };

  result.perPage =
    params.perPage ??
    urlParams.perPage ??
    localStorageQueryParams?.perPage ??
    DEFAULT_QUERY_PARAMS.perPage;

  result.sortField = params.sortField ?? queryParams.sortField ?? DEFAULT_QUERY_PARAMS.sortField;

  result.sortOrder =
    params.sortOrder ??
    urlParams.sortOrder ??
    localStorageQueryParams?.sortOrder ??
    DEFAULT_QUERY_PARAMS.sortOrder;

  result.page = params.page ?? urlParams.page ?? DEFAULT_QUERY_PARAMS.page;

  return result;
};

export function useAllCasesQueryParams(isModalView: boolean = false) {
  const location = useLocation();
  const history = useHistory();

  const [queryParams, setQueryParams] = useState<QueryParams>({ ...DEFAULT_QUERY_PARAMS });

  const [localStorageQueryParams, setLocalStorageQueryParams] =
    useLocalStorage<LocalStorageQueryParams>('cases.list.preferences');

  const persistAndUpdateQueryParams = useCallback(
    (params) => {
      if (isModalView) {
        setQueryParams(params);
        return;
      }

      const urlParams: UrlQueryParams = parseUrlQueryParams(location.search);
      const newQueryParams: QueryParams = getQueryParams(
        params,
        queryParams,
        urlParams,
        localStorageQueryParams
      );
      const newLocalStorageQueryParams = {
        perPage: newQueryParams.perPage,
        sortOrder: newQueryParams.sortOrder,
      };
      const newUrlParams = {
        page: newQueryParams.page,
        ...newLocalStorageQueryParams,
      };

      if (!isEqual(newUrlParams, urlParams)) {
        history.push({
          ...location,
          search: stringify(newUrlParams),
        });

        setLocalStorageQueryParams(newLocalStorageQueryParams);
        setQueryParams(newQueryParams);
      }
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

  useEffect(() => {
    persistAndUpdateQueryParams(isModalView ? DEFAULT_QUERY_PARAMS : {});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    queryParams,
    setQueryParams: persistAndUpdateQueryParams,
  };
}
