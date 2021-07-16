/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useUrlParams } from './use_url_params';

const parseFiltersMap = (currentFilters: string) => {
  let filterKueries: Map<string, string[]>;
  try {
    filterKueries = new Map<string, string[]>(JSON.parse(currentFilters));
  } catch {
    filterKueries = new Map<string, string[]>();
  }

  return filterKueries;
};

const getUpdateFilters = (
  filterKueries: Map<string, string[]>,
  fieldName: string,
  values?: string[]
) => {
  // add new term to filter map, toggle it off if already present

  const updatedFilterMap = new Map<string, string[] | undefined>(filterKueries);
  updatedFilterMap.set(fieldName, values);
  Array.from(updatedFilterMap.keys()).forEach((key) => {
    const value = updatedFilterMap.get(key);
    if (value && value.length === 0) {
      updatedFilterMap.delete(key);
    }
  });

  // store the new set of filters
  const persistedFilters = Array.from(updatedFilterMap);
  return persistedFilters.length === 0 ? '' : JSON.stringify(persistedFilters);
};

export const useFilterUpdate = (
  fieldName?: string,
  values?: string[],
  notValues?: string[],
  shouldUpdateUrl: boolean = true
) => {
  const [getUrlParams, updateUrl] = useUrlParams();

  const { filters: currentFilters, excludedFilters: currentExcludedFilters } = getUrlParams();

  useEffect(() => {
    const filterKueries: Map<string, string[]> = parseFiltersMap(currentFilters);
    const excludedFilterKueries: Map<string, string[]> = parseFiltersMap(currentExcludedFilters);

    if (fieldName) {
      // store the new set of filters
      // update filters in the URL from filter group
      const newFilters = getUpdateFilters(filterKueries, fieldName, values);
      if (currentFilters !== newFilters && shouldUpdateUrl) {
        updateUrl({ filters: newFilters, pagination: '' });
      }

      const newExcludedFilters = getUpdateFilters(excludedFilterKueries, fieldName, notValues);
      if (currentExcludedFilters !== newExcludedFilters && shouldUpdateUrl) {
        updateUrl({ excludedFilters: newExcludedFilters, pagination: '' });
      }
    }
    // eslint-disable-next-line
  }, [fieldName, values, notValues]);
};
