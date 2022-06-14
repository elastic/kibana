/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useGlobalQueryString } from '../../utils/global_query_string';
import { makeMapStateToProps } from '../url_state/helpers';
import { getSearch, getUrlStateSearch } from './helpers';
import { SearchNavTab } from './types';

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
    if (globalQueryString.length > 0) {
      return `${getUrlStateSearch(urlState)}&${globalQueryString}`;
    }

    return getUrlStateSearch(urlState);
  }, [urlState, globalQueryString]);

  return getUrlStateQueryString;
};
