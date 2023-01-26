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
  closeAddIndicesFlyout: () => void;
  engineUpdated: UpdateEngineApiLogicActions['apiSuccess'];
  fetchEngine: EngineViewActions['fetchEngine'];
  openAddIndicesFlyout: () => void;
  removeIndexFromEngine: (indexName: string) => { indexName: string };
  updateEngineRequest: UpdateEngineApiLogicActions['makeRequest'];
}

export interface EngineIndicesLogicValues {
  addIndicesFlyoutOpen: boolean;
  engineData: EngineViewValues['engineData'];
  engineName: EngineViewValues['engineName'];
}

export const EngineIndicesLogic = kea<
  MakeLogicType<EngineIndicesLogicValues, EngineIndicesLogicActions>
>({
  actions: {
    addIndicesToEngine: (indices) => ({ indices }),
    closeAddIndicesFlyout: () => true,
    openAddIndicesFlyout: () => true,
    removeIndexFromEngine: (indexName) => ({ indexName }),
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
    submitIndicesToAdd: () => {
      actions.addIndicesToEngine(values.indicesToAdd);
    },
  }),
  path: ['enterprise_search', 'content', 'engine_indices_logic'],
  reducers: {
    addIndicesFlyoutOpen: [
      false,
      {
        closeAddIndicesFlyout: () => false,
        openAddIndicesFlyout: () => true,
      },
    ],
  },
});
