/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import type { SearchResult } from '@elastic/search-ui';

import { flashAPIErrors } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { formatResult } from '../../utils/results';
import { EngineLogic } from '../engine';

interface SearchValues {
  searchDataLoading: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
}

interface SearchActions {
  search(query: string): { query: string };
  onSearch({ results }: { results: SearchResult[] }): { results: SearchResult[] };
}

export const SearchLogic = kea<MakeLogicType<SearchValues, SearchActions>>({
  key: (props) => props.id,
  path: (key: string) => ['enterprise_search', 'app_search', 'search_logic', key],
  actions: () => ({
    search: (query) => ({ query }),
    onSearch: ({ results }) => ({ results }),
  }),
  reducers: () => ({
    searchDataLoading: [
      false,
      {
        search: () => true,
        onSearch: () => false,
      },
    ],
    searchQuery: [
      '',
      {
        search: (_, { query }) => query,
      },
    ],
    searchResults: [
      [],
      {
        onSearch: (_, { results }) => results.map((res) => formatResult(res) as SearchResult),
      },
    ],
  }),
  listeners: ({ actions }) => ({
    search: async ({ query }, breakpoint) => {
      await breakpoint(250);

      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.post<{ results: SearchResult[] }>(
          `/internal/app_search/engines/${engineName}/search`,
          { query: { query } }
        );
        actions.onSearch(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
