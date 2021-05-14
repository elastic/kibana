/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors, setSuccessMessage } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';
import { EngineDetails } from '../engine/types';
import { EnginesAPIResponse } from '../engines/types';

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

// TODO Test this seperately from fetchSourceEngines/fetchIndexedEngines
export const fetchEngines = (
  path: string,
  onComplete: (engines: EngineDetails[]) => void,
  query = {}
) => {
  const { http } = HttpLogic.values;

  let enginesAccumulator: EngineDetails[] = [];

  // We need to recursively fetch all source engines because we put the data
  // into an EuiInMemoryTable to enable searching
  const recursiveFetchEngines = async (page = 1) => {
    try {
      const { meta, results }: EnginesAPIResponse = await http.get(path, {
        query: {
          'page[current]': page,
          'page[size]': 25,
          ...query,
        },
      });

      enginesAccumulator = [...enginesAccumulator, ...results];

      if (page >= meta.page.total_pages) {
        onComplete(enginesAccumulator);
      } else {
        recursiveFetchEngines(page + 1);
      }
    } catch (e) {
      flashAPIErrors(e);
    }
  };

  recursiveFetchEngines();
};

interface SourceEnginesLogicActions {
  addSourceEngines: (sourceEngineNames: string[]) => { sourceEngineNames: string[] };
  fetchIndexedEngines: () => void;
  fetchSourceEngines: () => void;
  onSourceEngineRemove: (sourceEngineNameToRemove: string) => { sourceEngineNameToRemove: string };
  onSourceEnginesAdd: (
    sourceEnginesToAdd: EngineDetails[]
  ) => { sourceEnginesToAdd: EngineDetails[] };
  onSourceEnginesFetch: (
    sourceEngines: SourceEnginesLogicValues['sourceEngines']
  ) => { sourceEngines: SourceEnginesLogicValues['sourceEngines'] };
  removeSourceEngine: (sourceEngineName: string) => { sourceEngineName: string };
  setIndexedEngines: (indexedEngines: EngineDetails[]) => { indexedEngines: EngineDetails[] };
  openModal: () => void;
  closeModal: () => void;
  onAddEnginesSelection: (
    selectedEngineNamesToAdd: string[]
  ) => { selectedEngineNamesToAdd: string[] };
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
        setIndexedEngines: (_, { indexedEngines }) => indexedEngines,
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
        // the response doesn't contain anything we care about
        await http.post(`/api/app_search/engines/${engineName}/source_engines/bulk_create`, {
          body: JSON.stringify({
            source_engine_slugs: sourceEngineNames,
          }),
        });

        const sourceEnginesToAdd = values.indexedEngines.filter(({ name }) =>
          sourceEngineNames.includes(name)
        );

        actions.onSourceEnginesAdd(sourceEnginesToAdd);
        setSuccessMessage(ADD_SOURCE_ENGINES_SUCCESS_MESSAGE(sourceEngineNames));
        EngineLogic.actions.initializeEngine();
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.closeModal();
      }
    },
    fetchSourceEngines: () => {
      const { engineName } = EngineLogic.values;

      fetchEngines(`/api/app_search/engines/${engineName}/source_engines`, (engines) =>
        actions.onSourceEnginesFetch(engines)
      );
    },
    fetchIndexedEngines: () => {
      fetchEngines('/api/app_search/engines', (engines) => actions.setIndexedEngines(engines), {
        type: 'indexed',
      });
    },
    removeSourceEngine: async ({ sourceEngineName }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        // the response doesn't contain anything we care about
        await http.delete(
          `/api/app_search/engines/${engineName}/source_engines/${sourceEngineName}`
        );

        actions.onSourceEngineRemove(sourceEngineName);
        EngineLogic.actions.initializeEngine();
        setSuccessMessage(REMOVE_SOURCE_ENGINE_SUCCESS_MESSAGE(sourceEngineName));
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
