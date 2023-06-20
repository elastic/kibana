/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  UpdateSearchApplicationApiLogic,
  UpdateSearchApplicationApiLogicActions,
} from '../../api/search_applications/update_search_application_api_logic';

import {
  EngineViewActions,
  EngineViewLogic,
  EngineViewValues,
} from './search_application_view_logic';

export interface EngineIndicesLogicActions {
  addIndicesToEngine: (indices: string[]) => { indices: string[] };
  closeAddIndicesFlyout: () => void;
  engineUpdated: UpdateSearchApplicationApiLogicActions['apiSuccess'];
  fetchEngine: EngineViewActions['fetchEngine'];
  openAddIndicesFlyout: () => void;
  removeIndexFromEngine: (indexName: string) => { indexName: string };
  updateEngineRequest: UpdateSearchApplicationApiLogicActions['makeRequest'];
}

export interface EngineIndicesLogicValues {
  addIndicesFlyoutOpen: boolean;
  engineData: EngineViewValues['engineData'];
  isLoadingEngine: EngineViewValues['isLoadingEngine'];
  searchApplicationName: EngineViewValues['searchApplicationName'];
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
      UpdateSearchApplicationApiLogic,
      ['makeRequest as updateEngineRequest', 'apiSuccess as engineUpdated'],
    ],
    values: [EngineViewLogic, ['engineData', 'searchApplicationName', 'isLoadingEngine']],
  },
  listeners: ({ actions, values }) => ({
    addIndicesToEngine: ({ indices }) => {
      if (!values.engineData) return;
      const existingIndicesNames = values.engineData.indices.map((index) => index.name);
      const updatedIndices = Array.from(new Set([...existingIndicesNames, ...indices]));
      actions.updateEngineRequest({
        name: values.searchApplicationName,
        indices: updatedIndices,
      });
    },
    engineUpdated: () => {
      actions.fetchEngine({ name: values.searchApplicationName });
    },
    removeIndexFromEngine: ({ indexName }) => {
      if (!values.engineData) return;
      const updatedIndices = values.engineData.indices
        .filter((index) => index.name !== indexName)
        .map((index) => index.name);
      actions.updateEngineRequest({
        name: values.searchApplicationName,
        indices: updatedIndices,
      });
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
