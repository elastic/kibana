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

import { EngineDetails } from '../engine/types';

import { getConflictingEnginesSet } from './utils';

interface MetaEnginesTableValues {
  expandedRows: { [id: string]: boolean };
  sourceEngines: { [id: string]: EngineDetails[] };
  expandedSourceEngines: { [id: string]: EngineDetails[] };
  conflictingEnginesSets: { [id: string]: Set<string> };
}

interface MetaEnginesTableActions {
  addSourceEngines(
    sourceEngines: MetaEnginesTableValues['sourceEngines']
  ): MetaEnginesTableValues['sourceEngines'];
  displayRow(itemId: string): string;
  fetchOrDisplayRow(itemId: string): string;
  fetchSourceEngines(engineName: string): string;
  hideRow(itemId: string): string;
}

interface EnginesAPIResponse {
  results: EngineDetails[];
  meta: Meta;
}

interface MetaEnginesTableProps {
  metaEngines: EngineDetails[];
}

export interface ConflictingEnginesSets {
  [key: string]: Set<string>;
}

export const MetaEnginesTableLogic = kea<
  MakeLogicType<MetaEnginesTableValues, MetaEnginesTableActions, MetaEnginesTableProps>
>({
  actions: () => ({
    addSourceEngines: (sourceEngines: object) => sourceEngines,
    displayRow: (itemId: string) => itemId,
    hideRow: (itemId: string) => itemId,
    fetchOrDisplayRow: (itemId) => itemId,
    fetchSourceEngines: (engineName) => engineName,
  }),
  reducers: () => ({
    expandedRows: [
      {},
      {
        displayRow: (expandedRows, itemId) => ({
          ...expandedRows,
          [itemId]: true,
        }),
        hideRow: (expandedRows, itemId) => {
          const newRows = { ...expandedRows };
          delete newRows[itemId];
          return newRows;
        },
      },
    ],
    sourceEngines: [
      {},
      {
        addSourceEngines: (sourceEngines, newEngines) => ({
          ...sourceEngines,
          ...newEngines,
        }),
      },
    ],
  }),
  selectors: {
    expandedSourceEngines: [
      (selectors) => [selectors.sourceEngines, selectors.expandedRows],
      (sourceEngines: MetaEnginesTableValues['sourceEngines'], expandedRows: string[]) => {
        return Object.keys(expandedRows).reduce((expandedRowMap, engineName) => {
          expandedRowMap[engineName] = sourceEngines[engineName];
          return expandedRowMap;
        }, {} as MetaEnginesTableValues['sourceEngines']);
      },
    ],
    conflictingEnginesSets: [
      () => [(_, props) => props.metaEngines],
      (metaEngines: EngineDetails[]): ConflictingEnginesSets =>
        metaEngines.reduce((accumulator, metaEngine) => {
          return {
            ...accumulator,
            [metaEngine.name]: getConflictingEnginesSet(metaEngine),
          };
        }, {}),
    ],
  },
  listeners: ({ actions, values }) => ({
    fetchOrDisplayRow: (itemId) => {
      const sourceEngines = values.sourceEngines;
      if (sourceEngines[itemId]) {
        actions.displayRow(itemId);
      } else {
        actions.fetchSourceEngines(itemId);
      }
    },
    fetchSourceEngines: (engineName) => {
      const { http } = HttpLogic.values;

      let enginesAccumulator: EngineDetails[] = [];

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
            actions.addSourceEngines({ [engineName]: enginesAccumulator });
            actions.displayRow(engineName);
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
