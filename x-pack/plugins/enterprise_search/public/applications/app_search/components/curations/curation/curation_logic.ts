/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { clearFlashMessages, flashAPIErrors } from '../../../../shared/flash_messages';
import { HttpLogic } from '../../../../shared/http';
import { KibanaLogic } from '../../../../shared/kibana';
import { ENGINE_CURATIONS_PATH } from '../../../routes';
import { EngineLogic, generateEnginePath } from '../../engine';

import { Curation } from '../types';
import { addDocument, removeDocument } from '../utils';

interface CurationValues {
  dataLoading: boolean;
  curation: Curation;
  queries: Curation['queries'];
  queriesLoading: boolean;
  activeQuery: string;
  organicDocumentsLoading: boolean;
  promotedIds: string[];
  promotedDocumentsLoading: boolean;
  hiddenIds: string[];
  hiddenDocumentsLoading: boolean;
}

interface CurationActions {
  loadCuration(): void;
  onCurationLoad(curation: Curation): { curation: Curation };
  updateCuration(): void;
  onCurationError(): void;
  updateQueries(queries: Curation['queries']): { queries: Curation['queries'] };
  setActiveQuery(query: string): { query: string };
  setPromotedIds(promotedIds: string[]): { promotedIds: string[] };
  addPromotedId(id: string): { id: string };
  removePromotedId(id: string): { id: string };
  clearPromotedIds(): void;
  addHiddenId(id: string): { id: string };
  removeHiddenId(id: string): { id: string };
  clearHiddenIds(): void;
  resetCuration(): void;
}

interface CurationProps {
  curationId: Curation['id'];
}

export const CurationLogic = kea<MakeLogicType<CurationValues, CurationActions, CurationProps>>({
  path: ['enterprise_search', 'app_search', 'curation_logic'],
  actions: () => ({
    loadCuration: true,
    onCurationLoad: (curation) => ({ curation }),
    updateCuration: true,
    onCurationError: true,
    updateQueries: (queries) => ({ queries }),
    setActiveQuery: (query) => ({ query }),
    setPromotedIds: (promotedIds) => ({ promotedIds }),
    addPromotedId: (id) => ({ id }),
    removePromotedId: (id) => ({ id }),
    clearPromotedIds: true,
    addHiddenId: (id) => ({ id }),
    removeHiddenId: (id) => ({ id }),
    clearHiddenIds: true,
    resetCuration: true,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadCuration: () => true,
        resetCuration: () => true,
        onCurationLoad: () => false,
        onCurationError: () => false,
      },
    ],
    curation: [
      {
        id: '',
        last_updated: '',
        queries: [],
        promoted: [],
        organic: [],
        hidden: [],
      },
      {
        onCurationLoad: (_, { curation }) => curation,
      },
    ],
    queries: [
      [],
      {
        onCurationLoad: (_, { curation }) => curation.queries,
        updateQueries: (_, { queries }) => queries,
      },
    ],
    queriesLoading: [
      false,
      {
        updateQueries: () => true,
        onCurationLoad: () => false,
        onCurationError: () => false,
      },
    ],
    activeQuery: [
      '',
      {
        setActiveQuery: (_, { query }) => query,
        onCurationLoad: (activeQuery, { curation }) => activeQuery || curation.queries[0],
      },
    ],
    organicDocumentsLoading: [
      false,
      {
        setActiveQuery: () => true,
        onCurationLoad: () => false,
        onCurationError: () => false,
      },
    ],
    promotedIds: [
      [],
      {
        onCurationLoad: (_, { curation }) => curation.promoted.map((document) => document.id),
        setPromotedIds: (_, { promotedIds }) => promotedIds,
        addPromotedId: (promotedIds, { id }) => addDocument(promotedIds, id),
        removePromotedId: (promotedIds, { id }) => removeDocument(promotedIds, id),
        clearPromotedIds: () => [],
      },
    ],
    promotedDocumentsLoading: [
      false,
      {
        setPromotedIds: () => true,
        addPromotedId: () => true,
        removePromotedId: () => true,
        clearPromotedIds: () => true,
        onCurationLoad: () => false,
        onCurationError: () => false,
      },
    ],
    hiddenIds: [
      [],
      {
        onCurationLoad: (_, { curation }) => curation.hidden.map((document) => document.id),
        addHiddenId: (hiddenIds, { id }) => addDocument(hiddenIds, id),
        removeHiddenId: (hiddenIds, { id }) => removeDocument(hiddenIds, id),
        clearHiddenIds: () => [],
      },
    ],
    hiddenDocumentsLoading: [
      false,
      {
        addHiddenId: () => true,
        removeHiddenId: () => true,
        clearHiddenIds: () => true,
        onCurationLoad: () => false,
        onCurationError: () => false,
      },
    ],
  }),
  listeners: ({ actions, values, props }) => ({
    loadCuration: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(
          `/api/app_search/engines/${engineName}/curations/${props.curationId}`,
          { query: { skip_record_analytics: 'true' } }
        );
        actions.onCurationLoad(response);
      } catch (e) {
        const { navigateToUrl } = KibanaLogic.values;

        flashAPIErrors(e, { isQueued: true });
        navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
      }
    },
    updateCuration: async (_, breakpoint) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      await breakpoint(100);
      clearFlashMessages();

      try {
        const response = await http.put(
          `/api/app_search/engines/${engineName}/curations/${props.curationId}`,
          {
            body: JSON.stringify({
              queries: values.queries,
              query: values.activeQuery,
              promoted: values.promotedIds,
              hidden: values.hiddenIds,
            }),
          }
        );
        actions.onCurationLoad(response);
      } catch (e) {
        flashAPIErrors(e);
        actions.onCurationError();
      }
    },
    updateQueries: ({ queries }) => {
      const activeQueryDeleted = !queries.includes(values.activeQuery);
      if (activeQueryDeleted) actions.setActiveQuery(queries[0]);

      actions.updateCuration();
    },
    setActiveQuery: () => actions.updateCuration(),
    setPromotedIds: () => actions.updateCuration(),
    addPromotedId: () => actions.updateCuration(),
    removePromotedId: () => actions.updateCuration(),
    clearPromotedIds: () => actions.updateCuration(),
    addHiddenId: () => actions.updateCuration(),
    removeHiddenId: () => actions.updateCuration(),
    clearHiddenIds: () => actions.updateCuration(),
    resetCuration: () => {
      actions.clearPromotedIds();
      actions.clearHiddenIds();
    },
  }),
});
