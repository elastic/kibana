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
import { SyntheticsUrlParams, getSupportedUrlParams } from '../utils/url_params';

// TODO: Create the following imports for new Synthetics App
import { selectedFiltersSelector } from '../../../legacy_uptime/state/selectors';
import { setSelectedFilters } from '../../../legacy_uptime/state/actions/selected_filters';
import { getFiltersFromMap } from '../../../legacy_uptime/hooks/use_selected_filters';
import { getParsedParams } from '../../../legacy_uptime/lib/helper/parse_search';

export type GetUrlParams = () => SyntheticsUrlParams;
export type UpdateUrlParams = (updatedParams: {
  [key: string]: string | number | boolean | undefined;
}) => void;

export type SyntheticsUrlParamsHook = () => [GetUrlParams, UpdateUrlParams];

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

export const useUrlParams: SyntheticsUrlParamsHook = () => {
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
