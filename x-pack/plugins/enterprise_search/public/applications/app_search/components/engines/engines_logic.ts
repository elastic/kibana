/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

interface OnEnginesFetch {
  engines: EngineDetails[];
  total: number;
}
interface EnginesActions {
  onEnginesFetch({ engines, total }: OnEnginesFetch): OnEnginesFetch;
  onMetaEnginesFetch({ engines, total }: OnEnginesFetch): OnEnginesFetch;
  onEnginesPagination(page: number): { page: number };
  onMetaEnginesPagination(page: number): { page: number };
  fetchEngines(): void;
  fetchMetaEngines(): void;
}

export const EnginesLogic = kea<MakeLogicType<EnginesValues, EnginesActions>>({
  path: ['enterprise_search', 'app_search', 'engines_logic'],
  actions: {
    onEnginesFetch: ({ engines, total }) => ({ engines, total }),
    onMetaEnginesFetch: ({ engines, total }) => ({ engines, total }),
    onEnginesPagination: (page) => ({ page }),
    onMetaEnginesPagination: (page) => ({ page }),
    fetchEngines: true,
    fetchMetaEngines: true,
  },
  reducers: {
    dataLoading: [
      true,
      {
        onEnginesFetch: () => false,
      },
    ],
    engines: [
      [],
      {
        onEnginesFetch: (_, { engines }) => engines,
      },
    ],
    enginesTotal: [
      0,
      {
        onEnginesFetch: (_, { total }) => total,
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
        onMetaEnginesFetch: (_, { engines }) => engines,
      },
    ],
    metaEnginesTotal: [
      0,
      {
        onMetaEnginesFetch: (_, { total }) => total,
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
    fetchEngines: async () => {
      const { http } = HttpLogic.values;
      const { enginesPage } = values;

      const response = await http.get('/api/app_search/engines', {
        query: { type: 'indexed', pageIndex: enginesPage },
      });
      actions.onEnginesFetch({
        engines: response.results,
        total: response.meta.page.total_results,
      });
    },
    fetchMetaEngines: async () => {
      const { http } = HttpLogic.values;
      const { metaEnginesPage } = values;

      const response = await http.get('/api/app_search/engines', {
        query: { type: 'meta', pageIndex: metaEnginesPage },
      });
      actions.onMetaEnginesFetch({
        engines: response.results,
        total: response.meta.page.total_results,
      });
    },
  }),
});
