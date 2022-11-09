/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode, encode } from 'rison-node';
import type { ParsedQuery } from 'query-string';
import { parse, stringify } from 'query-string';
import { url } from '@kbn/kibana-utils-plugin/public';
import { useHistory } from 'react-router-dom';
import { useCallback } from 'react';
import { SecurityPageName } from '../../../app/types';

export const isDetectionsPages = (pageName: string) =>
  pageName === SecurityPageName.alerts ||
  pageName === SecurityPageName.rules ||
  pageName === SecurityPageName.rulesCreate ||
  pageName === SecurityPageName.exceptions;

export const decodeRisonUrlState = <T>(value: string | undefined): T | null => {
  try {
    return value ? (decode(value) as unknown as T) : null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return null;
    }
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const encodeRisonUrlState = (state: any) => encode(state);

export const getQueryStringFromLocation = (search: string) => search.substring(1);

export const getParamFromQueryString = (
  queryString: string,
  key: string
): string | undefined | null => {
  const parsedQueryString = parse(queryString, { sort: false });
  const queryParam = parsedQueryString[key];

  return Array.isArray(queryParam) ? queryParam[0] : queryParam;
};

/**
 *
 * Gets the value of the URL param from the query string.
 * It doesn't update when the URL changes.
 *
 */
export const useGetInitialUrlParamValue = <State>(urlParamKey: string) => {
  // window.location.search provides the most updated representation of the url search.
  // It also guarantees that we don't overwrite URL param managed outside react-router.
  const getInitialUrlParamValue = useCallback(() => {
    const param = getParamFromQueryString(
      getQueryStringFromLocation(window.location.search),
      urlParamKey
    );

    const decodedParam = decodeRisonUrlState<State>(param ?? undefined);

    return { param, decodedParam };
  }, [urlParamKey]);

  return getInitialUrlParamValue;
};

export const encodeQueryString = (urlParams: ParsedQuery<string>): string =>
  stringify(url.encodeQuery(urlParams), { sort: false, encode: false });

export const useReplaceUrlParams = () => {
  const history = useHistory();

  const replaceUrlParams = useCallback(
    (params: Array<{ key: string; value: string | null }>) => {
      // window.location.search provides the most updated representation of the url search.
      // It prevents unnecessary re-renders which useLocation would create because 'replaceUrlParams' does update the location.
      // window.location.search also guarantees that we don't overwrite URL param managed outside react-router.
      const search = window.location.search;
      const urlParams = parse(search, { sort: false });

      params.forEach(({ key, value }) => {
        if (value == null || value === '') {
          delete urlParams[key];
        } else {
          urlParams[key] = value;
        }
      });

      const newSearch = encodeQueryString(urlParams);

      if (getQueryStringFromLocation(search) !== newSearch) {
        history.replace({ search: newSearch });
      }
    },
    [history]
  );
  return replaceUrlParams;
};
