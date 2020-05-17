/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse, stringify } from 'query-string';
import { useLocation, useHistory } from 'react-router-dom';
import { UptimeUrlParams, getSupportedUrlParams } from '../lib/helper';

export type GetUrlParams = () => UptimeUrlParams;
export type UpdateUrlParams = (updatedParams: {
  [key: string]: string | number | boolean | undefined;
}) => void;

export type UptimeUrlParamsHook = () => [GetUrlParams, UpdateUrlParams];

const getParsedParams = (search: string) => {
  return search ? parse(search[0] === '?' ? search.slice(1) : search, { sort: false }) : {};
};

export const useGetUrlParams: GetUrlParams = () => {
  const location = useLocation();

  const params = getParsedParams(location?.search);

  return getSupportedUrlParams(params);
};

export const useUrlParams: UptimeUrlParamsHook = () => {
  const location = useLocation();
  const history = useHistory();

  const updateUrlParams: UpdateUrlParams = updatedParams => {
    if (!history || !location) return;
    const { pathname, search } = location;
    const currentParams = getParsedParams(search);
    const mergedParams = {
      ...currentParams,
      ...updatedParams,
    };

    history.push({
      pathname,
      search: stringify(
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
        }, {}),
        { sort: false }
      ),
    });
  };

  return [useGetUrlParams, updateUrlParams];
};
