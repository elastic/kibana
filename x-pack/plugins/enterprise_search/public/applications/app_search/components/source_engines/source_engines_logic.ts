/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';
import { EngineDetails } from '../engine/types';

interface EnginesAPIResponse {
  results: EngineDetails[];
  meta: Meta;
}

interface SourceEnginesLogicValues {
  dataLoading: boolean;
  sourceEngines: EngineDetails[];
}

interface SourceEnginesLogicActions {
  fetchSourceEngines: () => void;
  setSourceEngines: (
    sourceEngines: SourceEnginesLogicValues['sourceEngines']
  ) => { sourceEngines: SourceEnginesLogicValues['sourceEngines'] };
}

export const SourceEnginesLogic = kea<
  MakeLogicType<SourceEnginesLogicValues, SourceEnginesLogicActions>
>({
  path: ['enterprise_search', 'app_search', 'source_engines_logic'],
  actions: () => ({
    fetchSourceEngines: true,
    setSourceEngines: (sourceEngines) => ({ sourceEngines }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        setSourceEngines: () => false,
      },
    ],
    sourceEngines: [
      [],
      {
        setSourceEngines: (_, { sourceEngines }) => sourceEngines,
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
            actions.setSourceEngines(enginesAccumulator);
          } else {
            recursiveFetchSourceEngines(page + 1);
          }
        } catch (e) {
          flashAPIErrors(e);
        }
      };

      recursiveFetchSourceEngines();
    },
  }),
});
