/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpLogic } from '../../../shared/http';

import { IndexingStatus } from '../schema/types';
import { EngineDetails } from './types';

interface EngineValues {
  dataLoading: boolean;
  engine: Partial<EngineDetails>;
  engineName: string;
  isMetaEngine: boolean;
  isSampleEngine: boolean;
  hasSchemaConflicts: boolean;
  hasUnconfirmedSchemaFields: boolean;
  engineNotFound: boolean;
}

interface EngineActions {
  setEngineData(engine: EngineDetails): { engine: EngineDetails };
  setEngineName(engineName: string): { engineName: string };
  setIndexingStatus(activeReindexJob: IndexingStatus): { activeReindexJob: IndexingStatus };
  setEngineNotFound(notFound: boolean): { notFound: boolean };
  clearEngine(): void;
  initializeEngine(): void;
}

export const EngineLogic = kea<MakeLogicType<EngineValues, EngineActions>>({
  path: ['enterprise_search', 'app_search', 'engine_logic'],
  actions: {
    setEngineData: (engine) => ({ engine }),
    setEngineName: (engineName) => ({ engineName }),
    setIndexingStatus: (activeReindexJob) => ({ activeReindexJob }),
    setEngineNotFound: (notFound) => ({ notFound }),
    clearEngine: true,
    initializeEngine: true,
  },
  reducers: {
    dataLoading: [
      true,
      {
        setEngineData: () => false,
        clearEngine: () => true,
      },
    ],
    engine: [
      {},
      {
        setEngineData: (_, { engine }) => engine,
        clearEngine: () => ({}),
        setIndexingStatus: (state, { activeReindexJob }) => ({
          ...state,
          activeReindexJob,
        }),
      },
    ],
    engineName: [
      '',
      {
        setEngineName: (_, { engineName }) => engineName,
      },
    ],
    engineNotFound: [
      false,
      {
        setEngineNotFound: (_, { notFound }) => notFound,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isMetaEngine: [() => [selectors.engine], (engine) => engine?.type === 'meta'],
    isSampleEngine: [() => [selectors.engine], (engine) => !!engine?.sample],
    hasSchemaConflicts: [
      () => [selectors.engine],
      (engine) => !!(engine?.schemaConflicts && Object.keys(engine.schemaConflicts).length > 0),
    ],
    hasUnconfirmedSchemaFields: [
      () => [selectors.engine],
      (engine) => engine?.unconfirmedFields?.length > 0,
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeEngine: async () => {
      const { engineName } = values;
      const { http } = HttpLogic.values;

      try {
        const response = await http.get(`/api/app_search/engines/${engineName}`);
        actions.setEngineData(response);
      } catch (error) {
        actions.setEngineNotFound(true);
      }
    },
  }),
});
