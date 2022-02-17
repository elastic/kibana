/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { DEFAULT_META } from '../../../shared/constants';
import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { updateMetaPageIndex } from '../../../shared/table_pagination';

import { EngineDetails, EngineTypes } from '../engine/types';

import { DELETE_ENGINE_MESSAGE } from './constants';
import { EnginesAPIResponse } from './types';

interface EnginesValues {
  dataLoading: boolean;
  engines: EngineDetails[];
  enginesMeta: Meta;
  enginesLoading: boolean;
  metaEngines: EngineDetails[];
  metaEnginesMeta: Meta; // keanu_whoa.jpg
  metaEnginesLoading: boolean;
}

interface EnginesActions {
  deleteEngine(engine: EngineDetails): { engine: EngineDetails };
  onDeleteEngineSuccess(engine: EngineDetails): { engine: EngineDetails };
  onEnginesLoad({ results, meta }: EnginesAPIResponse): EnginesAPIResponse;
  onMetaEnginesLoad({ results, meta }: EnginesAPIResponse): EnginesAPIResponse;
  onEnginesPagination(page: number): { page: number };
  onMetaEnginesPagination(page: number): { page: number };
  loadEngines(): void;
  loadMetaEngines(): void;
}

export const EnginesLogic = kea<MakeLogicType<EnginesValues, EnginesActions>>({
  path: ['enterprise_search', 'app_search', 'engines_logic'],
  actions: {
    deleteEngine: (engine) => ({ engine }),
    onDeleteEngineSuccess: (engine) => ({ engine }),
    onEnginesLoad: ({ results, meta }) => ({ results, meta }),
    onMetaEnginesLoad: ({ results, meta }) => ({ results, meta }),
    onEnginesPagination: (page) => ({ page }),
    onMetaEnginesPagination: (page) => ({ page }),
    loadEngines: true,
    loadMetaEngines: true,
  },
  reducers: {
    engines: [
      [],
      {
        onEnginesLoad: (_, { results }) => results,
      },
    ],
    enginesMeta: [
      DEFAULT_META,
      {
        onEnginesLoad: (_, { meta }) => meta,
        onEnginesPagination: (state, { page }) => updateMetaPageIndex(state, page),
      },
    ],
    enginesLoading: [
      true,
      {
        loadEngines: () => true,
        onEnginesLoad: () => false,
      },
    ],
    metaEngines: [
      [],
      {
        onMetaEnginesLoad: (_, { results }) => results,
      },
    ],
    metaEnginesMeta: [
      DEFAULT_META,
      {
        onMetaEnginesLoad: (_, { meta }) => meta,
        onMetaEnginesPagination: (state, { page }) => updateMetaPageIndex(state, page),
      },
    ],
    metaEnginesLoading: [
      true,
      {
        loadMetaEngines: () => true,
        onMetaEnginesLoad: () => false,
      },
    ],
  },
  selectors: {
    dataLoading: [
      (selectors) => [selectors.enginesLoading, selectors.engines],
      (enginesLoading, engines) => enginesLoading && !engines.length,
    ],
  },
  listeners: ({ actions, values }) => ({
    deleteEngine: async ({ engine }) => {
      const { http } = HttpLogic.values;
      let response;

      try {
        response = await http.delete(`/internal/app_search/engines/${engine.name}`);
      } catch (e) {
        flashAPIErrors(e);
      }

      if (response) {
        actions.onDeleteEngineSuccess(engine);
      }
    },
    loadEngines: async () => {
      const { http } = HttpLogic.values;
      const { enginesMeta } = values;

      try {
        const response = await http.get<EnginesAPIResponse>('/internal/app_search/engines', {
          query: {
            type: 'indexed',
            'page[current]': enginesMeta.page.current,
            'page[size]': enginesMeta.page.size,
          },
        });
        actions.onEnginesLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    loadMetaEngines: async () => {
      const { http } = HttpLogic.values;
      const { metaEnginesMeta } = values;

      try {
        const response = await http.get<EnginesAPIResponse>('/internal/app_search/engines', {
          query: {
            type: 'meta',
            'page[current]': metaEnginesMeta.page.current,
            'page[size]': metaEnginesMeta.page.size,
          },
        });
        actions.onMetaEnginesLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    onDeleteEngineSuccess: async ({ engine }) => {
      flashSuccessToast(DELETE_ENGINE_MESSAGE(engine.name));
      if ([EngineTypes.default, EngineTypes.indexed].includes(engine.type)) {
        actions.loadEngines();
      } else if (engine.type === EngineTypes.meta) {
        actions.loadMetaEngines();
      }
    },
  }),
});
