/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { parse, stringify } from 'query-string';
import { useLocation, useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { UptimeUrlParams, getSupportedUrlParams } from '../lib/helper';
import { selectedFiltersSelector } from '../state/selectors';
import { setSelectedFilters } from '../state/actions/selected_filters';

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

const getMapFromFilters = (value: any): Map<string, any> | undefined => {
  try {
    return new Map(JSON.parse(value));
  } catch {
    return undefined;
  }
};

const mapMapToObject = (map: Map<string, any>) => ({
  locations: map.get('observer.geo.name') ?? [],
  ports: map.get('url.port') ?? [],
  schemes: map.get('monitor.type') ?? [],
  tags: map.get('tags') ?? [],
});

export const useUrlParams: UptimeUrlParamsHook = () => {
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  const selectedFilters = useSelector(selectedFiltersSelector);
  const { filters } = useGetUrlParams();
  useEffect(() => {
    if (selectedFilters === null) {
      const filterMap = getMapFromFilters(filters);
      if (filterMap) {
        dispatch(setSelectedFilters(mapMapToObject(filterMap)));
      }
    }
  }, [dispatch, filters, selectedFilters]);

  const updateUrlParams: UpdateUrlParams = (updatedParams) => {
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
    const filterMap = getMapFromFilters(mergedParams.filters);
    if (!filterMap) {
      dispatch(setSelectedFilters(null));
    } else {
      dispatch(setSelectedFilters(mapMapToObject(filterMap)));
    }
  };

  return [useGetUrlParams, updateUrlParams];
};
