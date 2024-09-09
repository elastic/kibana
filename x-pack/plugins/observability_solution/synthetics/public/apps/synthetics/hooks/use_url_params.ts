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
  updatedParams: Partial<SyntheticsUrlParams> | null,
  replaceState?: boolean
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
    (updatedParams, replaceState = false) => {
      const currentParams = getParsedParams(search);
      const mergedParams = {
        ...currentParams,
        ...updatedParams,
      };

      const urlKeys = Object.keys(mergedParams) as Array<keyof SyntheticsUrlParams>;

      const updatedSearch = updatedParams
        ? stringify(
            // drop any parameters that have no value
            urlKeys.reduce((params, key) => {
              const value = mergedParams[key];
              if (value === undefined || value === '') {
                return params;
              }

              return {
                ...params,
                [key]: value,
              };
            }, {})
          )
        : null;

      // only update the URL if the search has actually changed
      if (search !== updatedSearch) {
        if (replaceState) {
          history.replace({
            pathname,
            search: updatedSearch || undefined,
          });
        } else {
          history.push({ pathname, search: updatedSearch || undefined });
        }
      }
    },
    [history, pathname, search]
  );

  return [useGetUrlParams, updateUrlParams];
};
