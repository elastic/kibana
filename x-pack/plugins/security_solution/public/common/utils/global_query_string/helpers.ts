/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RisonValue } from '@kbn/rison';
import { safeDecode, encode } from '@kbn/rison';
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
export const useGetInitialUrlParamValue = <State extends RisonValue>(
  urlParamKey: string
): (() => State | null) => {
  // window.location.search provides the most updated representation of the url search.
  // It also guarantees that we don't overwrite URL param managed outside react-router.
  const getInitialUrlParamValue = useCallback((): State | null => {
    const rawParamValue = getParamFromQueryString(
      getQueryStringFromLocation(window.location.search),
      urlParamKey
    );
    const paramValue = safeDecode(rawParamValue ?? '') as State | null;

    return paramValue;
  }, [urlParamKey]);

  return getInitialUrlParamValue;
};

export const encodeQueryString = (urlParams: ParsedQuery<string>): string =>
  stringify(url.encodeQuery(urlParams), { sort: false, encode: false });

export const useReplaceUrlParams = (): ((params: Record<string, RisonValue | null>) => void) => {
  const history = useHistory();

  const replaceUrlParams = useCallback(
    (params: Record<string, RisonValue | null>): void => {
      // window.location.search provides the most updated representation of the url search.
      // It prevents unnecessary re-renders which useLocation would create because 'replaceUrlParams' does update the location.
      // window.location.search also guarantees that we don't overwrite URL param managed outside react-router.
      const search = window.location.search;
      const urlParams = parse(search, { sort: false });

      Object.keys(params).forEach((key) => {
        const value = params[key];

        if (value == null || value === '') {
          delete urlParams[key];
          return;
        }

        try {
          urlParams[key] = encode(value);
        } catch {
          // eslint-disable-next-line no-console
          console.error('Unable to encode url param value');
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
