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
  SearchApplicationViewActions,
  SearchApplicationViewLogic,
  SearchApplicationViewValues,
} from './search_application_view_logic';

export interface EngineIndicesLogicActions {
  addIndicesToEngine: (indices: string[]) => { indices: string[] };
  closeAddIndicesFlyout: () => void;
  engineUpdated: UpdateSearchApplicationApiLogicActions['apiSuccess'];
  fetchSearchApplication: SearchApplicationViewActions['fetchSearchApplication'];
  openAddIndicesFlyout: () => void;
  removeIndexFromEngine: (indexName: string) => { indexName: string };
  updateEngineRequest: UpdateSearchApplicationApiLogicActions['makeRequest'];
}

export interface EngineIndicesLogicValues {
  addIndicesFlyoutOpen: boolean;
  isLoadingSearchApplication: SearchApplicationViewValues['isLoadingSearchApplication'];
  searchApplicationData: SearchApplicationViewValues['searchApplicationData'];
  searchApplicationName: SearchApplicationViewValues['searchApplicationName'];
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
      SearchApplicationViewLogic,
      ['fetchSearchApplication'],
      UpdateSearchApplicationApiLogic,
      ['makeRequest as updateEngineRequest', 'apiSuccess as engineUpdated'],
    ],
    values: [
      SearchApplicationViewLogic,
      ['searchApplicationData', 'searchApplicationName', 'isLoadingSearchApplication'],
    ],
  },
  listeners: ({ actions, values }) => ({
    addIndicesToEngine: ({ indices }) => {
      if (!values.searchApplicationData) return;
      const existingIndicesNames = values.searchApplicationData.indices.map((index) => index.name);
      const updatedIndices = Array.from(new Set([...existingIndicesNames, ...indices]));
      actions.updateEngineRequest({
        name: values.searchApplicationName,
        indices: updatedIndices,
      });
    },
    engineUpdated: () => {
      actions.fetchSearchApplication({ name: values.searchApplicationName });
    },
    removeIndexFromEngine: ({ indexName }) => {
      if (!values.searchApplicationData) return;
      const updatedIndices = values.searchApplicationData.indices
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
