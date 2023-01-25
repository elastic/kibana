/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  UpdateEngineApiLogic,
  UpdateEngineApiLogicActions,
} from '../../api/engines/update_engine_api_logic';

import { FetchIndicesAPILogic } from '../../api/index/fetch_indices_api_logic';

import { EngineViewActions, EngineViewLogic, EngineViewValues } from './engine_view_logic';

export interface EngineIndicesLogicActions {
  addIndicesToEngine: (indices: string[]) => { indices: string[] };
  engineUpdated: UpdateEngineApiLogicActions['apiSuccess'];
  fetchEngine: EngineViewActions['fetchEngine'];
  removeIndexFromEngine: (indexName: string) => { indexName: string };
  updateEngineRequest: UpdateEngineApiLogicActions['makeRequest'];

  fetchIndices: FetchIndicesAPILogic['makeRequest'];
  searchIndices: (searchQuery: string) => { searchQuery: string };
}

export interface EngineIndicesLogicValues {
  engineData: EngineViewValues['engineData'];
  engineName: EngineViewValues['engineName'];

  indicesToAdd: string[];
  indicesOptions: { label: string; checked?: string };
}

export const EngineIndicesLogic = kea<
  MakeLogicType<EngineIndicesLogicValues, EngineIndicesLogicActions>
>({
  actions: {
    addIndicesToEngine: (indices) => ({ indices }),
    removeIndexFromEngine: (indexName) => ({ indexName }),

    searchIndices: (searchQuery) => ({ searchQuery }),
    setIndicesToAdd: (indices) => ({ indices }),
    submitIndicesToAdd: () => true,
  },
  connect: {
    actions: [
      EngineViewLogic,
      ['fetchEngine'],
      UpdateEngineApiLogic,
      ['makeRequest as updateEngineRequest', 'apiSuccess as engineUpdated'],
      FetchIndicesAPILogic,
      ['makeRequest as fetchIndices', 'apiSuccess as indicesFetched'],
    ],
    values: [
      EngineViewLogic,
      ['engineData', 'engineName'],
      FetchIndicesAPILogic,
      ['data as indicesData', 'status as fetchIndicesApiStatus'],
    ],
  },
  listeners: ({ actions, values }) => ({
    addIndicesToEngine: ({ indices }) => {
      if (!values.engineData) return;
      const existingIndicesNames = values.engineData.indices.map((index) => index.name);
      const updatedIndices = Array.from(new Set([...existingIndicesNames, ...indices]));
      actions.updateEngineRequest({
        engineName: values.engineName,
        indices: updatedIndices,
      });
    },
    submitIndicesToAdd: () => {
      actions.addIndicesToEngine(values.indicesToAdd);
    },
    engineUpdated: () => {
      actions.fetchEngine({ engineName: values.engineName });
    },
    removeIndexFromEngine: ({ indexName }) => {
      if (!values.engineData) return;
      const updatedIndices = values.engineData.indices
        .filter((index) => index.name !== indexName)
        .map((index) => index.name);
      actions.updateEngineRequest({
        engineName: values.engineName,
        indices: updatedIndices,
      });
    },
    searchIndices: async ({ searchQuery }, breakpoint) => {
      await breakpoint(300);

      actions.fetchIndices({
        meta: { page: { current: 1 } },
        returnHiddenIndices: false,
        searchQuery,
      });
    },
  }),
  path: ['enterprise_search', 'content', 'engine_indices_logic'],
  reducers: {
    indicesToAdd: [[], { setIndicesToAdd: (_, { indices }) => indices }],
  },
  selectors: ({ selectors }) => ({
    indicesOptions: [
      () => [selectors.indicesData, selectors.indicesToAdd],
      (data, toAdd) =>
        [
          ...toAdd.map((i) => ({ label: i, checked: 'on' })),
          ...(data?.indices
            .filter((i) => !toAdd.includes(i.name))
            .map((i) => ({ label: i.name })) ?? []),
        ].sort((a, b) => (a.label < b.label ? -1 : 1)),
    ],
    isLoadingIndices: [
      () => [selectors.fetchIndicesApiStatus],
      (status) => status === 'loading' || status === 'idle',
    ],
  }),
});
