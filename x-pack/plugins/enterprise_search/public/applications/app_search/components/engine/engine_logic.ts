/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashErrorToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { ApiTokenTypes } from '../credentials/constants';
import { ApiToken } from '../credentials/types';

import { POLLING_DURATION, POLLING_ERROR_TITLE, POLLING_ERROR_TEXT } from './constants';
import { EngineDetails, EngineTypes } from './types';

interface EngineValues {
  dataLoading: boolean;
  engine: Partial<EngineDetails>;
  engineName: string;
  hasNoDocuments: boolean;
  hasEmptySchema: boolean;
  isMetaEngine: boolean;
  isSampleEngine: boolean;
  hasSchemaErrors: boolean;
  hasSchemaConflicts: boolean;
  hasUnconfirmedSchemaFields: boolean;
  engineNotFound: boolean;
  searchKey: string;
  intervalId: number | null;
}

interface EngineActions {
  setEngineData(engine: EngineDetails): { engine: EngineDetails };
  setEngineName(engineName: string): { engineName: string };
  setEngineNotFound(notFound: boolean): { notFound: boolean };
  clearEngine(): void;
  initializeEngine(): void;
  pollEmptyEngine(): void;
  onPollStart(intervalId: number): { intervalId: number };
  stopPolling(): void;
  onPollStop(): void;
}

export const EngineLogic = kea<MakeLogicType<EngineValues, EngineActions>>({
  path: ['enterprise_search', 'app_search', 'engine_logic'],
  actions: {
    setEngineData: (engine) => ({ engine }),
    setEngineName: (engineName) => ({ engineName }),
    setEngineNotFound: (notFound) => ({ notFound }),
    clearEngine: true,
    initializeEngine: true,
    pollEmptyEngine: true,
    onPollStart: (intervalId) => ({ intervalId }),
    stopPolling: true,
    onPollStop: true,
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
      },
    ],
    engineName: [
      '',
      {
        setEngineName: (_, { engineName }) => engineName,
        clearEngine: () => '',
      },
    ],
    engineNotFound: [
      false,
      {
        setEngineNotFound: (_, { notFound }) => notFound,
        clearEngine: () => false,
      },
    ],
    intervalId: [
      null,
      {
        onPollStart: (_, { intervalId }) => intervalId,
        onPollStop: () => null,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    hasNoDocuments: [() => [selectors.engine], (engine) => !engine.document_count],
    hasEmptySchema: [
      () => [selectors.engine],
      (engine) => Object.keys(engine.schema || {}).length === 0,
    ],
    isMetaEngine: [() => [selectors.engine], (engine) => engine?.type === EngineTypes.meta],
    isSampleEngine: [() => [selectors.engine], (engine) => !!engine?.sample],
    // Indexed engines
    hasSchemaErrors: [
      () => [selectors.engine],
      ({ activeReindexJob }) => activeReindexJob?.numDocumentsWithErrors > 0,
    ],
    // Meta engines
    hasSchemaConflicts: [
      () => [selectors.engine],
      (engine) => !!(engine?.schemaConflicts && Object.keys(engine.schemaConflicts).length > 0),
    ],
    hasUnconfirmedSchemaFields: [
      () => [selectors.engine],
      (engine) => engine?.unconfirmedFields?.length > 0,
    ],
    searchKey: [
      () => [selectors.engine],
      (engine: Partial<EngineDetails>) => {
        const isSearchKey = (token: ApiToken) => token.type === ApiTokenTypes.Search;
        const searchKey = (engine.apiTokens || []).find(isSearchKey);
        return searchKey?.key || '';
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeEngine: async (_, breakpoint) => {
      breakpoint(); // Prevents errors if logic unmounts while fetching

      const { engineName } = values;
      const { http } = HttpLogic.values;

      try {
        const response = await http.get<EngineDetails>(
          `/internal/app_search/engines/${engineName}`
        );
        actions.setEngineData(response);
      } catch (error) {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          actions.setEngineNotFound(true);
        } else {
          flashErrorToast(POLLING_ERROR_TITLE, {
            text: POLLING_ERROR_TEXT,
            toastLifeTimeMs: POLLING_DURATION * 0.75,
          });
        }
      }
    },
    pollEmptyEngine: () => {
      if (values.intervalId) return; // Ensure we only have one poll at a time

      const id = window.setInterval(() => {
        if (values.hasNoDocuments) {
          actions.initializeEngine(); // Re-fetch engine data when engine is empty
        } else {
          actions.stopPolling();
        }
      }, POLLING_DURATION);

      actions.onPollStart(id);
    },
    stopPolling: () => {
      if (values.intervalId !== null) {
        clearInterval(values.intervalId);
        actions.onPollStop();
      }
    },
  }),
  events: ({ actions }) => ({
    beforeUnmount: () => {
      actions.stopPolling();
    },
  }),
});
