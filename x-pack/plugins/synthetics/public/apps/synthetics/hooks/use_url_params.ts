/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { parse, stringify } from 'query-string';
import { useLocation, useHistory } from 'react-router-dom';
import { SyntheticsUrlParams, getSupportedUrlParams } from '../utils/url_params';

function getParsedParams(search: string) {
  return search ? parse(search[0] === '?' ? search.slice(1) : search, { sort: false }) : {};
}

export type GetUrlParams = () => SyntheticsUrlParams;
export type UpdateUrlParams = (
  updatedParams: {
    [key: string]: string | number | boolean | undefined;
  },
  clearAllParams?: boolean
) => void;

export type SyntheticsUrlParamsHook = () => [GetUrlParams, UpdateUrlParams];

export const useGetUrlParams: GetUrlParams = () => {
  const { search } = useLocation();

  return getSupportedUrlParams(getParsedParams(search));
};

export const useUrlParams: SyntheticsUrlParamsHook = () => {
  const { pathname, search } = useLocation();
  const history = useHistory();

  const updateUrlParams: UpdateUrlParams = useCallback(
    (updatedParams, clearAllParams = false) => {
      const currentParams = getParsedParams(search);
      const mergedParams = {
        ...currentParams,
        ...updatedParams,
      };

      const updatedSearch = stringify(
        // drop any parameters that have no value
        Object.keys(mergedParams).reduce((params, key) => {
          const value = mergedParams[key];
          if (value === undefined || value === '') {
            return params;
          }

          return {
            ...params,
            [key]: value,
          };
        }, {})
      );

      // only update the URL if the search has actually changed
      if (search !== updatedSearch) {
        history.push({ pathname, search: !clearAllParams ? updatedSearch : undefined });
      }
    },
    [history, pathname, search]
  );

  return [useGetUrlParams, updateUrlParams];
};
