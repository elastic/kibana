/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { stringify } from 'query-string';
import { useLocation, useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { UptimeUrlParams, getSupportedUrlParams } from '../lib/helper';
import { selectedFiltersSelector } from '../state/selectors';
import { setSelectedFilters } from '../state/actions/selected_filters';
import { getFiltersFromMap } from './use_selected_filters';
import { getParsedParams } from '../lib/helper/parse_search';

export type GetUrlParams = () => UptimeUrlParams;
export type UpdateUrlParams = (updatedParams: {
  [key: string]: string | number | boolean | undefined;
}) => void;

export type UptimeUrlParamsHook = () => [GetUrlParams, UpdateUrlParams];

export const useGetUrlParams: GetUrlParams = () => {
  const { search } = useLocation();

  return getSupportedUrlParams(getParsedParams(search));
};

const getMapFromFilters = (value: any): Map<string, any> | undefined => {
  try {
    return new Map(JSON.parse(value));
  } catch {
    return undefined;
  }
};

export const useUrlParams: UptimeUrlParamsHook = () => {
  const { pathname, search } = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  const selectedFilters = useSelector(selectedFiltersSelector);
  const { filters } = useGetUrlParams();

  useEffect(() => {
    if (selectedFilters === null) {
      const filterMap = getMapFromFilters(filters);
      if (filterMap) {
        dispatch(setSelectedFilters(getFiltersFromMap(filterMap)));
      }
    }
  }, [dispatch, filters, selectedFilters]);

  const updateUrlParams: UpdateUrlParams = useCallback(
    (updatedParams) => {
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
        history.push({ pathname, search: updatedSearch });
      }
      const filterMap = getMapFromFilters(mergedParams.filters);
      if (!filterMap) {
        dispatch(setSelectedFilters(null));
      } else {
        dispatch(setSelectedFilters(getFiltersFromMap(filterMap)));
      }
    },
    [dispatch, history, pathname, search]
  );

  return [useGetUrlParams, updateUrlParams];
};
