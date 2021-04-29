/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { flashAPIErrors, setSuccessMessage } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';
import { EngineDetails } from '../engine/types';
import { EnginesAPIResponse } from '../engines/types';

export interface SourceEnginesLogicValues {
  addSourceEnginesModalOpen: boolean;
  dataLoading: boolean;
  sourceEngines: EngineDetails[];
}

const REMOVE_SOURCE_ENGINE_SUCCESS_MESSAGE = (engineName: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.engine.souceEngines.removeEngineSuccessMessage',
    {
      defaultMessage: 'Engine {engineName} has been removed from this meta engine.',
      values: { engineName },
    }
  );

interface SourceEnginesLogicActions {
  closeAddSourceEnginesModal: () => void;
  fetchSourceEngines: () => void;
  onSourceEngineRemove: (sourceEngineNameToRemove: string) => { sourceEngineNameToRemove: string };
  onSourceEnginesFetch: (
    sourceEngines: SourceEnginesLogicValues['sourceEngines']
  ) => { sourceEngines: SourceEnginesLogicValues['sourceEngines'] };
  openAddSourceEnginesModal: () => void;
  removeSourceEngine: (sourceEngineName: string) => { sourceEngineName: string };
}

export const SourceEnginesLogic = kea<
  MakeLogicType<SourceEnginesLogicValues, SourceEnginesLogicActions>
>({
  path: ['enterprise_search', 'app_search', 'source_engines_logic'],
  actions: () => ({
    closeAddSourceEnginesModal: true,
    fetchSourceEngines: true,
    onSourceEngineRemove: (sourceEngineNameToRemove) => ({ sourceEngineNameToRemove }),
    onSourceEnginesFetch: (sourceEngines) => ({ sourceEngines }),
    openAddSourceEnginesModal: true,
    removeSourceEngine: (sourceEngineName) => ({ sourceEngineName }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        onSourceEnginesFetch: () => false,
      },
    ],
    addSourceEnginesModalOpen: [
      false,
      {
        openAddSourceEnginesModal: () => true,
        closeAddSourceEnginesModal: () => false,
      },
    ],
    sourceEngines: [
      [],
      {
        onSourceEnginesFetch: (_, { sourceEngines }) => sourceEngines,
        onSourceEngineRemove: (sourceEngines, { sourceEngineNameToRemove }) =>
          sourceEngines.filter((sourceEngine) => sourceEngine.name !== sourceEngineNameToRemove),
      },
    ],
  }),
  listeners: ({ actions }) => ({
    fetchSourceEngines: () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      let enginesAccumulator: EngineDetails[] = [];

      // We need to recursively fetch all source engines because we put the data
      // into an EuiInMemoryTable to enable searching
      const recursiveFetchSourceEngines = async (page = 1) => {
        try {
          const { meta, results }: EnginesAPIResponse = await http.get(
            `/api/app_search/engines/${engineName}/source_engines`,
            {
              query: {
                'page[current]': page,
                'page[size]': 25,
              },
            }
          );

          enginesAccumulator = [...enginesAccumulator, ...results];

          if (page >= meta.page.total_pages) {
            actions.onSourceEnginesFetch(enginesAccumulator);
          } else {
            recursiveFetchSourceEngines(page + 1);
          }
        } catch (e) {
          flashAPIErrors(e);
        }
      };

      recursiveFetchSourceEngines();
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
