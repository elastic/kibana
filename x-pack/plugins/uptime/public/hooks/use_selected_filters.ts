/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { useGetUrlParams } from './use_url_params';

export const useSelectedFilters = () => {
  const { filters } = useGetUrlParams();

  return useMemo(() => {
    let selectedFilters: Map<string, string[]>;
    try {
      selectedFilters = new Map<string, string[]>(JSON.parse(filters));
    } catch {
      selectedFilters = new Map<string, string[]>();
    }

    return {
      selectedTags: selectedFilters.get('tags') || [],
      selectedPorts: selectedFilters.get('url.port') || [],
      selectedSchemes: selectedFilters.get('monitor.type') || [],
      selectedLocations: selectedFilters.get('observer.geo.name') || [],
    };
  }, [filters]);
};
