/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';

import { getEsQueryFromSavedSearch } from '../application/utils/search_utils';
import type { AiOpsIndexBasedAppState } from '../application/utils/url_state';
import { useAiopsAppContext } from './use_aiops_app_context';

export const useSearch = (
  { dataView, savedSearch }: { dataView: DataView; savedSearch: SavedSearch | null },
  aiopsListState: AiOpsIndexBasedAppState,
  readOnly: boolean = false
) => {
  const {
    uiSettings,
    data: {
      query: { filterManager },
    },
  } = useAiopsAppContext();

  const searchData = getEsQueryFromSavedSearch({
    dataView,
    uiSettings,
    savedSearch,
    filterManager,
  });

  if (searchData === undefined || (aiopsListState && aiopsListState.searchString !== '')) {
    if (aiopsListState?.filters && readOnly === false) {
      const globalFilters = filterManager?.getGlobalFilters();

      if (filterManager) filterManager.setFilters(aiopsListState.filters);
      if (globalFilters) filterManager?.addFilters(globalFilters);
    }
    return {
      searchQuery: aiopsListState?.searchQuery,
      searchString: aiopsListState?.searchString,
      searchQueryLanguage: aiopsListState?.searchQueryLanguage,
    };
  } else {
    return {
      searchQuery: searchData.searchQuery,
      searchString: searchData.searchString,
      searchQueryLanguage: searchData.queryLanguage,
    };
  }
};
