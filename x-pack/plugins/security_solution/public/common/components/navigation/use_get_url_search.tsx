/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useMemo } from 'react';

import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useGlobalQueryString } from '../../utils/global_query_string';
import { getQueryStringFromLocation, makeMapStateToProps } from '../url_state/helpers';
import { getSearch, getUrlStateSearch } from './helpers';
import type { SearchNavTab } from './types';

export const useGetUrlSearch = (tab?: SearchNavTab) => {
  const mapState = makeMapStateToProps();
  const { urlState } = useDeepEqualSelector(mapState);
  const globalQueryString = useGlobalQueryString();
  const urlSearch = useMemo(
    () => (tab ? getSearch(tab, urlState, globalQueryString) : ''),
    [tab, urlState, globalQueryString]
  );

  return urlSearch;
};

export const useGetUrlStateQueryString = () => {
  const mapState = makeMapStateToProps();
  const { urlState } = useDeepEqualSelector(mapState);
  const globalQueryString = useGlobalQueryString();
  const getUrlStateQueryString = useCallback(() => {
    // TODO: Temporary code while we are migrating all query strings to global_query_string_manager
    const urlStateSearch = getQueryStringFromLocation(getUrlStateSearch(urlState));
    const isNotEmpty = (e: string) => !isEmpty(e);
    const search = [urlStateSearch, globalQueryString].filter(isNotEmpty).join('&');

    return search.length > 0 ? `?${search}` : '';
  }, [urlState, globalQueryString]);

  return getUrlStateQueryString;
};
