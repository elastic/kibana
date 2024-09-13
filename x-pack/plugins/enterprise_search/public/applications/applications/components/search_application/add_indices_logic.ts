/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { UpdateSearchApplicationApiLogic } from '../../api/search_applications/update_search_application_api_logic';

import {
  SearchApplicationIndicesLogic,
  SearchApplicationIndicesLogicActions,
} from './search_application_indices_logic';

export interface AddIndicesLogicActions {
  addIndicesToSearchApplication: SearchApplicationIndicesLogicActions['addIndicesToSearchApplication'];
  closeAddIndicesFlyout: SearchApplicationIndicesLogicActions['closeAddIndicesFlyout'];
  searchApplicationUpdated: SearchApplicationIndicesLogicActions['searchApplicationUpdated'];
  setSelectedIndices: (indices: string[]) => {
    indices: string[];
  };
  submitSelectedIndices: () => void;
}

export interface AddIndicesLogicValues {
  selectedIndices: string[];
  updateSearchApplicationError: typeof UpdateSearchApplicationApiLogic.values.error | undefined;
  updateSearchApplicationStatus: typeof UpdateSearchApplicationApiLogic.values.status;
}

export const AddIndicesLogic = kea<MakeLogicType<AddIndicesLogicValues, AddIndicesLogicActions>>({
  actions: {
    setSelectedIndices: (indices: string[]) => ({ indices }),
    submitSelectedIndices: () => true,
  },
  connect: {
    actions: [
      SearchApplicationIndicesLogic,
      ['addIndicesToSearchApplication', 'searchApplicationUpdated', 'closeAddIndicesFlyout'],
    ],
    values: [
      UpdateSearchApplicationApiLogic,
      ['status as updateSearchApplicationStatus', 'error as updateSearchApplicationError'],
    ],
  },
  listeners: ({ actions, values }) => ({
    searchApplicationUpdated: () => {
      actions.closeAddIndicesFlyout();
    },
    submitSelectedIndices: () => {
      const { selectedIndices } = values;
      if (selectedIndices.length === 0) return;

      actions.addIndicesToSearchApplication(selectedIndices);
    },
  }),
  path: ['enterprise_search', 'content', 'add_indices_logic'],
  reducers: {
    selectedIndices: [
      [],
      {
        closeAddIndicesFlyout: () => [],
        // @ts-expect-error upgrade typescript v5.1.6
        setSelectedIndices: (_, { indices }) => indices,
      },
    ],
  },
});
