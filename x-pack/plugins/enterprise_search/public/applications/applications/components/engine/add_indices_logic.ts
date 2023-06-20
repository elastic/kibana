/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { UpdateEngineApiLogic } from '../../api/engines/update_engine_api_logic';

import { EngineIndicesLogic, EngineIndicesLogicActions } from './engine_indices_logic';

export interface AddIndicesLogicActions {
  addIndicesToEngine: EngineIndicesLogicActions['addIndicesToEngine'];
  closeAddIndicesFlyout: EngineIndicesLogicActions['closeAddIndicesFlyout'];
  engineUpdated: EngineIndicesLogicActions['engineUpdated'];
  setSelectedIndices: (indices: string[]) => {
    indices: string[];
  };
  submitSelectedIndices: () => void;
}

export interface AddIndicesLogicValues {
  selectedIndices: string[];
  updateEngineError: typeof UpdateEngineApiLogic.values.error | undefined;
  updateEngineStatus: typeof UpdateEngineApiLogic.values.status;
}

export const AddIndicesLogic = kea<MakeLogicType<AddIndicesLogicValues, AddIndicesLogicActions>>({
  actions: {
    setSelectedIndices: (indices: string[]) => ({ indices }),
    submitSelectedIndices: () => true,
  },
  connect: {
    actions: [EngineIndicesLogic, ['addIndicesToEngine', 'engineUpdated', 'closeAddIndicesFlyout']],
    values: [UpdateEngineApiLogic, ['status as updateEngineStatus', 'error as updateEngineError']],
  },
  listeners: ({ actions, values }) => ({
    engineUpdated: () => {
      actions.closeAddIndicesFlyout();
    },
    submitSelectedIndices: () => {
      const { selectedIndices } = values;
      if (selectedIndices.length === 0) return;

      actions.addIndicesToEngine(selectedIndices);
    },
  }),
  path: ['enterprise_search', 'content', 'add_indices_logic'],
  reducers: {
    selectedIndices: [
      [],
      {
        closeAddIndicesFlyout: () => [],
        setSelectedIndices: (_, { indices }) => indices,
      },
    ],
  },
});
