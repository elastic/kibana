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

export function useUrlState(isModalView: boolean = false) {
  const location = useLocation();
  const history = useHistory();

  const [queryParams, setQueryParams] = useState<UrlQueryParams>({});

  const [localStorageQueryParams, setLocalStorageQueryParams] =
    useLocalStorage<LocalStorageQueryParams>('cases.list.preferences');

  const persistAndUpdateQueryParams = useCallback(
    (params) => {
      const urlParams: UrlQueryParams = parseUrlQueryParams(location.search);
      const newQueryParams: QueryParams = { ...DEFAULT_QUERY_PARAMS };

      newQueryParams.perPage =
        params.perPage ??
        urlParams.perPage ??
        localStorageQueryParams?.perPage ??
        DEFAULT_QUERY_PARAMS.perPage;
      newQueryParams.sortField =
        params.sortField ?? queryParams.sortField ?? DEFAULT_QUERY_PARAMS.sortField;
      newQueryParams.sortOrder =
        params.sortOrder ??
        urlParams.sortOrder ??
        localStorageQueryParams?.sortOrder ??
        DEFAULT_QUERY_PARAMS.sortOrder;
      newQueryParams.page = params.page ?? urlParams.page ?? DEFAULT_QUERY_PARAMS.page;

      if (!isEqual(queryParams, newQueryParams)) {
        const newLocalStorageQueryParams = {
          perPage: newQueryParams.perPage,
          sortOrder: newQueryParams.sortOrder,
        };

        setLocalStorageQueryParams(newLocalStorageQueryParams);

        const newUrlParams = {
          page: newQueryParams.page,
          ...newLocalStorageQueryParams,
        };

        history.replace({
          ...location,
          search: stringify(newUrlParams),
        });

        setQueryParams(newQueryParams);
      }
    },
    [history, localStorageQueryParams, location, setLocalStorageQueryParams, queryParams]
  );

  const setUrlQueryParams = useCallback(
    (params) => {
      if (isModalView) {
        setQueryParams(params);
      } else {
        persistAndUpdateQueryParams(params);
      }
    },
    [persistAndUpdateQueryParams, isModalView]
  );

  useEffect(() => {
    setUrlQueryParams(isModalView ? DEFAULT_QUERY_PARAMS : {});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    queryParams,
    setUrlQueryParams,
  };
}
