/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useUrlParams } from './use_url_params';

export const parseFiltersMap = (currentFilters: string): Map<string, string[]> => {
  try {
    return new Map(JSON.parse(currentFilters));
  } catch {
    return new Map();
  }
};

const getUpdateFilters = (
  filterKueries: Map<string, string[]>,
  fieldName: string,
  values?: string[]
): string => {
  // add new term to filter map, toggle it off if already present
  const updatedFilterMap = new Map<string, string[] | undefined>(filterKueries);
  updatedFilterMap.set(fieldName, values ?? []);
  updatedFilterMap.forEach((value, key) => {
    if (typeof value !== 'undefined' && value.length === 0) {
      updatedFilterMap.delete(key);
    }
  });

  // store the new set of filters
  const persistedFilters = Array.from(updatedFilterMap);
  return persistedFilters.length === 0 ? '' : JSON.stringify(persistedFilters);
};

export function addUpdatedField(
  current: string,
  key: string,
  updated: string,
  objToUpdate: { [key: string]: string }
): void {
  if (current !== updated || current !== '') {
    objToUpdate[key] = updated;
  }
}

export const useFilterUpdate = (
  fieldName: string,
  values: string[],
  notValues: string[],
  shouldUpdateUrl: boolean = true
) => {
  const [getUrlParams, updateUrl] = useUrlParams();

  const { filters, excludedFilters } = getUrlParams();

  useEffect(() => {
    const currentFiltersMap: Map<string, string[]> = parseFiltersMap(filters);
    const currentExclusionsMap: Map<string, string[]> = parseFiltersMap(excludedFilters);
    const newFiltersString = getUpdateFilters(currentFiltersMap, fieldName, values);
    const newExclusionsString = getUpdateFilters(currentExclusionsMap, fieldName, notValues);

    const update: { [key: string]: string } = {};

    addUpdatedField(filters, 'filters', newFiltersString, update);
    addUpdatedField(excludedFilters, 'excludedFilters', newExclusionsString, update);

    if (shouldUpdateUrl && Object.keys(update).length > 0) {
      // reset pagination whenever filters change
      updateUrl({ ...update, pagination: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName, values, notValues]);
};
