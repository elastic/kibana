/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useUrlParams } from './use_url_params';

export const parseFiltersMap = (currentFilters: string) => {
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
  updatedFilterMap.set(fieldName, values ?? []);
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

  const {
    filters: currentFiltersString,
    excludedFilters: currentExclusionsString,
  } = getUrlParams();

  useEffect(() => {
    if (fieldName) {
      const currentFiltersMap: Map<string, string[]> = parseFiltersMap(currentFiltersString);
      const currentExclusionsMap: Map<string, string[]> = parseFiltersMap(currentExclusionsString);
      const newFiltersString = getUpdateFilters(currentFiltersMap, fieldName, values);
      const newExclusionsString = getUpdateFilters(currentExclusionsMap, fieldName, notValues);

      const update: { [key: string]: string } = {};
      if (currentFiltersString !== newFiltersString) {
        update.filters = newFiltersString;
      } else {
        update.filters = currentFiltersString;
      }

      if (currentExclusionsString !== newExclusionsString) {
        update.excludedFilters = newExclusionsString;
      } else {
        update.excludedFilters = currentExclusionsString;
      }
      if (shouldUpdateUrl && Object.keys(update).length > 0) {
        updateUrl({ ...update, pagination: '' });
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName, values, notValues]);
};
