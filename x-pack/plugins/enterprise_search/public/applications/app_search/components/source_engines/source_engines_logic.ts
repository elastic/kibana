/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { recursivelyFetchEngines } from '../../utils/recursively_fetch_engines';
import { EngineLogic } from '../engine';
import { EngineDetails, EngineTypes } from '../engine/types';

import { ADD_SOURCE_ENGINES_SUCCESS_MESSAGE, REMOVE_SOURCE_ENGINE_SUCCESS_MESSAGE } from './i18n';

export interface SourceEnginesLogicValues {
  dataLoading: boolean;
  modalLoading: boolean;
  isModalOpen: boolean;
  indexedEngines: EngineDetails[];
  indexedEngineNames: string[];
  sourceEngines: EngineDetails[];
  sourceEngineNames: string[];
  selectableEngineNames: string[];
  selectedEngineNamesToAdd: string[];
}

interface SourceEnginesLogicActions {
  addSourceEngines: (sourceEngineNames: string[]) => { sourceEngineNames: string[] };
  fetchIndexedEngines: () => void;
  fetchSourceEngines: () => void;
  onSourceEngineRemove: (sourceEngineNameToRemove: string) => { sourceEngineNameToRemove: string };
  onSourceEnginesAdd: (sourceEnginesToAdd: EngineDetails[]) => {
    sourceEnginesToAdd: EngineDetails[];
  };
  onSourceEnginesFetch: (sourceEngines: SourceEnginesLogicValues['sourceEngines']) => {
    sourceEngines: SourceEnginesLogicValues['sourceEngines'];
  };
  removeSourceEngine: (sourceEngineName: string) => { sourceEngineName: string };
  setIndexedEngines: (indexedEngines: EngineDetails[]) => { indexedEngines: EngineDetails[] };
  openModal: () => void;
  closeModal: () => void;
  onAddEnginesSelection: (selectedEngineNamesToAdd: string[]) => {
    selectedEngineNamesToAdd: string[];
  };
}

export const SourceEnginesLogic = kea<
  MakeLogicType<SourceEnginesLogicValues, SourceEnginesLogicActions>
>({
  path: ['enterprise_search', 'app_search', 'source_engines_logic'],
  actions: () => ({
    addSourceEngines: (sourceEngineNames) => ({ sourceEngineNames }),
    fetchIndexedEngines: true,
    fetchSourceEngines: true,
    onSourceEngineRemove: (sourceEngineNameToRemove) => ({ sourceEngineNameToRemove }),
    onSourceEnginesAdd: (sourceEnginesToAdd) => ({ sourceEnginesToAdd }),
    onSourceEnginesFetch: (sourceEngines) => ({ sourceEngines }),
    removeSourceEngine: (sourceEngineName) => ({ sourceEngineName }),
    setIndexedEngines: (indexedEngines) => ({ indexedEngines }),
    openModal: true,
    closeModal: true,
    onAddEnginesSelection: (selectedEngineNamesToAdd) => ({ selectedEngineNamesToAdd }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        onSourceEnginesFetch: () => false,
      },
    ],
    modalLoading: [
      false,
      {
        addSourceEngines: () => true,
        closeModal: () => false,
      },
    ],
    isModalOpen: [
      false,
      {
        openModal: () => true,
        closeModal: () => false,
      },
    ],
    indexedEngines: [
      [],
      {
        setIndexedEngines: (_, { indexedEngines }) =>
          indexedEngines.filter(({ type }) => type !== EngineTypes.elasticsearch),
      },
    ],
    selectedEngineNamesToAdd: [
      [],
      {
        closeModal: () => [],
        onAddEnginesSelection: (_, { selectedEngineNamesToAdd }) => selectedEngineNamesToAdd,
      },
    ],
    sourceEngines: [
      [],
      {
        onSourceEnginesAdd: (sourceEngines, { sourceEnginesToAdd }) => [
          ...sourceEngines,
          ...sourceEnginesToAdd,
        ],
        onSourceEnginesFetch: (_, { sourceEngines }) => sourceEngines,
        onSourceEngineRemove: (sourceEngines, { sourceEngineNameToRemove }) =>
          sourceEngines.filter((sourceEngine) => sourceEngine.name !== sourceEngineNameToRemove),
      },
    ],
  }),
  selectors: {
    indexedEngineNames: [
      (selectors) => [selectors.indexedEngines],
      (indexedEngines) => indexedEngines.map((engine: EngineDetails) => engine.name),
    ],
    sourceEngineNames: [
      (selectors) => [selectors.sourceEngines],
      (sourceEngines) => sourceEngines.map((engine: EngineDetails) => engine.name),
    ],
    selectableEngineNames: [
      (selectors) => [selectors.indexedEngineNames, selectors.sourceEngineNames],
      (indexedEngineNames, sourceEngineNames) =>
        indexedEngineNames.filter((engineName: string) => !sourceEngineNames.includes(engineName)),
    ],
  },
  listeners: ({ actions, values }) => ({
    addSourceEngines: async ({ sourceEngineNames }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.post(`/internal/app_search/engines/${engineName}/source_engines/bulk_create`, {
          body: JSON.stringify({
            source_engine_slugs: sourceEngineNames,
          }),
        });

        const sourceEnginesToAdd = values.indexedEngines.filter(({ name }) =>
          sourceEngineNames.includes(name)
        );

        actions.onSourceEnginesAdd(sourceEnginesToAdd);
        flashSuccessToast(ADD_SOURCE_ENGINES_SUCCESS_MESSAGE(sourceEngineNames));
        EngineLogic.actions.initializeEngine();
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.closeModal();
      }
    },
    fetchSourceEngines: () => {
      const { engineName } = EngineLogic.values;

      recursivelyFetchEngines({
        endpoint: `/internal/app_search/engines/${engineName}/source_engines`,
        onComplete: (engines) => actions.onSourceEnginesFetch(engines),
      });
    },
    fetchIndexedEngines: () => {
      recursivelyFetchEngines({
        endpoint: '/internal/app_search/engines',
        onComplete: (engines) => actions.setIndexedEngines(engines),
        query: { type: 'indexed' },
      });
    },
    removeSourceEngine: async ({ sourceEngineName }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.delete(
          `/internal/app_search/engines/${engineName}/source_engines/${sourceEngineName}`
        );

        actions.onSourceEngineRemove(sourceEngineName);
        flashSuccessToast(REMOVE_SOURCE_ENGINE_SUCCESS_MESSAGE(sourceEngineName));

        // Changing source engines can change schema conflicts and invalid boosts,
        // so we re-initialize the engine to re-fetch that data
        EngineLogic.actions.initializeEngine(); //
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
