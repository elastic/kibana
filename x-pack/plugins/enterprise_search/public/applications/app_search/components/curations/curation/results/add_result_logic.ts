/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';

import { EngineLogic } from '../../../engine';
import { Result } from '../../../result/types';

interface AddResultValues {
  isFlyoutOpen: boolean;
  dataLoading: boolean;
  searchQuery: string;
  searchResults: Result[];
}

interface AddResultActions {
  openFlyout(): void;
  closeFlyout(): void;
  search(query: string): { query: string };
  onSearch({ results }: { results: Result[] }): { results: Result[] };
}

export const AddResultLogic = kea<MakeLogicType<AddResultValues, AddResultActions>>({
  path: ['enterprise_search', 'app_search', 'curation_add_result_logic'],
  actions: () => ({
    openFlyout: true,
    closeFlyout: true,
    search: (query) => ({ query }),
    onSearch: ({ results }) => ({ results }),
  }),
  reducers: () => ({
    isFlyoutOpen: [
      false,
      {
        openFlyout: () => true,
        closeFlyout: () => false,
      },
    ],
    dataLoading: [
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
        openFlyout: () => '',
      },
    ],
    searchResults: [
      [],
      {
        onSearch: (_, { results }) => results,
      },
    ],
  }),
  listeners: ({ actions }) => ({
    search: async ({ query }, breakpoint) => {
      await breakpoint(250);

      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(`/api/app_search/engines/${engineName}/curation_search`, {
          query: { query },
        });
        actions.onSearch(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
