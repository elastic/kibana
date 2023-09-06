/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';

import { useEffect } from 'react';
import { FilterStateStore } from '@kbn/es-query';
import type { BasicAppState } from '../../data_drift/types';
import { getEsQueryFromSavedSearch } from '../../index_data_visualizer/utils/saved_search_utils';
import { useDataVisualizerKibana } from '../../kibana_context';

export const useSearch = (
  { dataView, savedSearch }: { dataView: DataView; savedSearch: SavedSearch | null | undefined },
  appState: BasicAppState,
  readOnly: boolean = false
) => {
  const {
    uiSettings,
    data: {
      query: { filterManager },
    },
  } = useDataVisualizerKibana().services;

  useEffect(
    function clearFiltersOnLeave() {
      return () => {
        // We want to clear all filters that have not been pinned globally
        // when navigating to other pages
        filterManager
          .getFilters()
          .filter((f) => f.$state?.store === FilterStateStore.APP_STATE)
          .forEach((f) => filterManager.removeFilter(f));
      };
    },
    [filterManager]
  );

  const searchData = getEsQueryFromSavedSearch({
    dataView,
    uiSettings,
    savedSearch,
    filterManager,
  });

  if (searchData === undefined || (appState && appState.searchString !== '')) {
    if (appState?.filters && readOnly === false) {
      const globalFilters = filterManager?.getGlobalFilters();

      if (filterManager) filterManager.setFilters(appState.filters);
      if (globalFilters) filterManager?.addFilters(globalFilters);
    }
    return {
      searchQuery: appState?.searchQuery,
      searchString: appState?.searchString,
      searchQueryLanguage: appState?.searchQueryLanguage,
    };
  } else {
    return {
      searchQuery: searchData.searchQuery,
      searchString: searchData.searchString,
      searchQueryLanguage: searchData.queryLanguage,
    };
  }
};
