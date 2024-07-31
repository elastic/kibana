/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../../shared/flash_messages';
import { HttpLogic } from '../../../../shared/http';
import { KibanaLogic } from '../../../../shared/kibana';
import { ENGINE_CURATIONS_PATH } from '../../../routes';
import { EngineLogic, generateEnginePath } from '../../engine';
import { DELETE_SUCCESS_MESSAGE } from '../constants';

import { Curation } from '../types';
import { addDocument, removeDocument } from '../utils';

type CurationPageTabs = 'promoted' | 'history' | 'hidden';

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
  isAutomated: boolean;
  selectedPageTab: CurationPageTabs;
}

interface CurationActions {
  convertToManual(): void;
  deleteCuration(): void;
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
  onSelectPageTab(pageTab: CurationPageTabs): { pageTab: CurationPageTabs };
}

interface CurationProps {
  curationId: Curation['id'];
}

export const CurationLogic = kea<MakeLogicType<CurationValues, CurationActions, CurationProps>>({
  path: ['enterprise_search', 'app_search', 'curation_logic'],
  actions: () => ({
    convertToManual: true,
    deleteCuration: true,
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
    onSelectPageTab: (pageTab) => ({ pageTab }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadCuration: () => true,
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
        // @ts-expect-error upgrade typescript v5.1.6
        onCurationLoad: (_, { curation }) => curation,
      },
    ],
    queries: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onCurationLoad: (_, { curation }) => curation.queries,
        // @ts-expect-error upgrade typescript v5.1.6
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
        // @ts-expect-error upgrade typescript v5.1.6
        setActiveQuery: (_, { query }) => query,
        // @ts-expect-error upgrade typescript v5.1.6
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
        // @ts-expect-error upgrade typescript v5.1.6
        onCurationLoad: (_, { curation }) => curation.promoted.map((document) => document.id),
        // @ts-expect-error upgrade typescript v5.1.6
        setPromotedIds: (_, { promotedIds }) => promotedIds,
        // @ts-expect-error upgrade typescript v5.1.6
        addPromotedId: (promotedIds, { id }) => addDocument(promotedIds, id),
        // @ts-expect-error upgrade typescript v5.1.6
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
        // @ts-expect-error upgrade typescript v5.1.6
        onCurationLoad: (_, { curation }) => curation.hidden.map((document) => document.id),
        // @ts-expect-error upgrade typescript v5.1.6
        addHiddenId: (hiddenIds, { id }) => addDocument(hiddenIds, id),
        // @ts-expect-error upgrade typescript v5.1.6
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
    selectedPageTab: [
      'promoted',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onSelectPageTab: (_, { pageTab }) => pageTab,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isAutomated: [
      () => [selectors.curation],
      (curation: CurationValues['curation']) => {
        return curation.suggestion?.status === 'automated';
      },
    ],
  }),
  listeners: ({ actions, values, props }) => ({
    convertToManual: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        await http.put(
          `/internal/app_search/engines/${engineName}/adaptive_relevance/suggestions`,
          {
            body: JSON.stringify([
              {
                query: values.activeQuery,
                type: 'curation',
                status: 'applied',
              },
            ]),
          }
        );
        actions.loadCuration();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteCuration: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      const { navigateToUrl } = KibanaLogic.values;

      try {
        await http.delete(
          `/internal/app_search/engines/${engineName}/curations/${props.curationId}`
        );
        navigateToUrl(generateEnginePath(ENGINE_CURATIONS_PATH));
        flashSuccessToast(DELETE_SUCCESS_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    loadCuration: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<Curation>(
          `/internal/app_search/engines/${engineName}/curations/${props.curationId}`,
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
        const response = await http.put<Curation>(
          `/internal/app_search/engines/${engineName}/curations/${props.curationId}`,
          {
            query: { skip_record_analytics: 'true' },
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
    onSelectPageTab: () => {
      clearFlashMessages();
    },
    setActiveQuery: () => actions.updateCuration(),
    setPromotedIds: () => actions.updateCuration(),
    addPromotedId: () => actions.updateCuration(),
    removePromotedId: () => actions.updateCuration(),
    clearPromotedIds: () => actions.updateCuration(),
    addHiddenId: () => actions.updateCuration(),
    removeHiddenId: () => actions.updateCuration(),
    clearHiddenIds: () => actions.updateCuration(),
  }),
});
