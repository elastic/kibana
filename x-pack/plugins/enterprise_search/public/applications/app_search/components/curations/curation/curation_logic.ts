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

interface CurationValues {
  dataLoading: boolean;
  curation: Curation;
  queries: Curation['queries'];
  queriesLoading: boolean;
  activeQuery: string;
  organicDocumentsLoading: boolean;
}

interface CurationActions {
  loadCuration(): void;
  onCurationLoad(curation: Curation): { curation: Curation };
  updateCuration(): void;
  onCurationError(): void;
  updateQueries(queries: Curation['queries']): { queries: Curation['queries'] };
  setActiveQuery(query: string): { query: string };
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
  }),
  listeners: ({ actions, values, props }) => ({
    loadCuration: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get(
          `/api/app_search/engines/${engineName}/curations/${props.curationId}`
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
              promoted: [], // TODO: promotedIds state
              hidden: [], // TODO: hiddenIds state
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
  }),
});
