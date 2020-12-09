/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useUrlParams } from './use_url_params';

export const useFilterUpdate = (
  fieldName?: string,
  values?: string[],
  shouldUpdateUrl: boolean = true
) => {
  const [getUrlParams, updateUrl] = useUrlParams();

  const { filters: currentFilters } = getUrlParams();

  // update filters in the URL from filter group
  const onFilterUpdate = (filtersKuery: string) => {
    if (currentFilters !== filtersKuery && shouldUpdateUrl) {
      updateUrl({ filters: filtersKuery, pagination: '' });
    }
  };

  let filterKueries: Map<string, string[]>;
  try {
    filterKueries = new Map<string, string[]>(JSON.parse(currentFilters));
  } catch {
    filterKueries = new Map<string, string[]>();
  }

  useEffect(() => {
    if (fieldName) {
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
      onFilterUpdate(persistedFilters.length === 0 ? '' : JSON.stringify(persistedFilters));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName, values]);
};
