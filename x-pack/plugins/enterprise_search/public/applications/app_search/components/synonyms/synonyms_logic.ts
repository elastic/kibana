/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { EngineLogic } from '../engine';

import { SYNONYMS_PAGE_META } from './constants';
import { SynonymSet, SynonymsApiResponse } from './types';

interface SynonymsValues {
  dataLoading: boolean;
  synonymSets: SynonymSet[];
  meta: Meta;
}

interface SynonymsActions {
  loadSynonyms(): void;
  onSynonymsLoad(response: SynonymsApiResponse): SynonymsApiResponse;
  onPaginate(newPageIndex: number): { newPageIndex: number };
}

export const SynonymsLogic = kea<MakeLogicType<SynonymsValues, SynonymsActions>>({
  path: ['enterprise_search', 'app_search', 'synonyms_logic'],
  actions: () => ({
    loadSynonyms: true,
    onSynonymsLoad: ({ results, meta }) => ({ results, meta }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadSynonyms: () => true,
        onSynonymsLoad: () => false,
      },
    ],
    synonymSets: [
      [],
      {
        onSynonymsLoad: (_, { results }) => results,
      },
    ],
    meta: [
      SYNONYMS_PAGE_META,
      {
        onSynonymsLoad: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    loadSynonyms: async () => {
      const { meta } = values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(`/api/app_search/engines/${engineName}/synonyms`, {
          query: {
            'page[current]': meta.page.current,
            'page[size]': meta.page.size,
          },
        });
        actions.onSynonymsLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
