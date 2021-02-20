/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpLogic } from '../../../shared/http';

import { EngineDetails } from '../engine/types';

interface EnginesValues {
  dataLoading: boolean;
  engines: EngineDetails[];
  enginesTotal: number;
  enginesPage: number;
  metaEngines: EngineDetails[];
  metaEnginesTotal: number;
  metaEnginesPage: number;
}

interface OnEnginesLoad {
  engines: EngineDetails[];
  total: number;
}
interface EnginesActions {
  onEnginesLoad({ engines, total }: OnEnginesLoad): OnEnginesLoad;
  onMetaEnginesLoad({ engines, total }: OnEnginesLoad): OnEnginesLoad;
  onEnginesPagination(page: number): { page: number };
  onMetaEnginesPagination(page: number): { page: number };
  loadEngines(): void;
  loadMetaEngines(): void;
}

export const EnginesLogic = kea<MakeLogicType<EnginesValues, EnginesActions>>({
  path: ['enterprise_search', 'app_search', 'engines_logic'],
  actions: {
    onEnginesLoad: ({ engines, total }) => ({ engines, total }),
    onMetaEnginesLoad: ({ engines, total }) => ({ engines, total }),
    onEnginesPagination: (page) => ({ page }),
    onMetaEnginesPagination: (page) => ({ page }),
    loadEngines: true,
    loadMetaEngines: true,
  },
  reducers: {
    dataLoading: [
      true,
      {
        onEnginesLoad: () => false,
      },
    ],
    engines: [
      [],
      {
        onEnginesLoad: (_, { engines }) => engines,
      },
    ],
    enginesTotal: [
      0,
      {
        onEnginesLoad: (_, { total }) => total,
      },
    ],
    enginesPage: [
      1,
      {
        onEnginesPagination: (_, { page }) => page,
      },
    ],
    metaEngines: [
      [],
      {
        onMetaEnginesLoad: (_, { engines }) => engines,
      },
    ],
    metaEnginesTotal: [
      0,
      {
        onMetaEnginesLoad: (_, { total }) => total,
      },
    ],
    metaEnginesPage: [
      1,
      {
        onMetaEnginesPagination: (_, { page }) => page,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    loadEngines: async () => {
      const { http } = HttpLogic.values;
      const { enginesPage } = values;

      const response = await http.get('/api/app_search/engines', {
        query: { type: 'indexed', pageIndex: enginesPage },
      });
      actions.onEnginesLoad({
        engines: response.results,
        total: response.meta.page.total_results,
      });
    },
    loadMetaEngines: async () => {
      const { http } = HttpLogic.values;
      const { metaEnginesPage } = values;

      const response = await http.get('/api/app_search/engines', {
        query: { type: 'meta', pageIndex: metaEnginesPage },
      });
      actions.onMetaEnginesLoad({
        engines: response.results,
        total: response.meta.page.total_results,
      });
    },
  }),
});
