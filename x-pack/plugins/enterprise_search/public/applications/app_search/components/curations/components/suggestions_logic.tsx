/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../../common/types';
import { DEFAULT_META } from '../../../../shared/constants';
import { flashAPIErrors } from '../../../../shared/flash_messages';
import { HttpLogic } from '../../../../shared/http';
import { updateMetaPageIndex } from '../../../../shared/table_pagination';
import { EngineLogic } from '../../engine';
import { CurationSuggestion } from '../types';

export interface SuggestionsAPIResponse {
  results: CurationSuggestion[];
  meta: Meta;
}

interface SuggestionsValues {
  dataLoading: boolean;
  suggestions: CurationSuggestion[];
  meta: Meta;
}

interface SuggestionActions {
  loadSuggestions(): void;
  onPaginate(newPageIndex: number): { newPageIndex: number };
  onSuggestionsLoaded(response: SuggestionsAPIResponse): SuggestionsAPIResponse;
}

export const SuggestionsLogic = kea<MakeLogicType<SuggestionsValues, SuggestionActions>>({
  path: ['enterprise_search', 'app_search', 'curations', 'suggestions_logic'],
  actions: () => ({
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    onSuggestionsLoaded: ({ results, meta }) => ({ results, meta }),
    loadSuggestions: true,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadSuggestions: () => true,
        onSuggestionsLoaded: () => false,
      },
    ],
    suggestions: [
      [],
      {
        onSuggestionsLoaded: (_, { results }) => results,
      },
    ],
    meta: [
      {
        ...DEFAULT_META,
        page: {
          ...DEFAULT_META.page,
          size: 10,
        },
      },
      {
        onSuggestionsLoaded: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    loadSuggestions: async () => {
      const { meta } = values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.post<SuggestionsAPIResponse>(
          `/internal/app_search/engines/${engineName}/adaptive_relevance/suggestions`,
          {
            body: JSON.stringify({
              page: {
                current: meta.page.current,
                size: meta.page.size,
              },
              filters: {
                status: ['pending'],
                type: 'curation',
              },
            }),
          }
        );
        actions.onSuggestionsLoaded(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
