/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpLogic } from '../../../shared/http';

import { Schema, IndexingStatus } from '../schema/types';
import { EngineDetails } from './types';

interface EngineValues {
  dataLoading: boolean;
  engine: EngineDetails | {};
  engineName: string;
  isMetaEngine: boolean;
  isSampleEngine: boolean;
  hasSchemaConflicts: boolean;
  engineNotFound: boolean;
}

interface EngineActions {
  setEngineData(engine: EngineDetails): { engine: EngineDetails };
  setEngineName(engineName: string): { engineName: string };
  setEngineSchema(schema: Schema): Schema;
  setIndexingStatus(activeReindexJob: IndexingStatus): IndexingStatus;
  setEngineNotFound(notFound: boolean): boolean;
  clearEngine(): void;
  initializeEngine(): void;
}

export const EngineLogic = kea<MakeLogicType<EngineValues, EngineActions>>({
  path: ['enterprise_search', 'app_search', 'engine_logic'],
  actions: {
    setEngineData: (engine) => ({ engine }),
    setEngineName: (engineName) => ({ engineName }),
    setEngineSchema: (schema) => schema,
    setIndexingStatus: (activeReindexJob) => activeReindexJob,
    setEngineNotFound: (notFound) => notFound,
    clearEngine: () => ({}),
    initializeEngine: () => null,
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
        setEngineSchema: (state, schema) => ({ ...state, schema }),
        setIndexingStatus: (state, activeReindexJob) => ({
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
        setEngineNotFound: (_, notFound) => notFound,
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
