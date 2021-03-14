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
}

interface CurationActions {
  loadCuration(): void;
  onCurationLoad(curation: Curation): { curation: Curation };
  updateCuration(options?: { queries?: string[] }): { queries?: string[] };
}

interface CurationProps {
  curationId: Curation['id'];
}

export const CurationLogic = kea<MakeLogicType<CurationValues, CurationActions, CurationProps>>({
  path: ['enterprise_search', 'app_search', 'curation_logic'],
  actions: () => ({
    loadCuration: true,
    onCurationLoad: (curation) => ({ curation }),
    updateCuration: ({ queries } = {}) => ({ queries }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadCuration: () => true,
        onCurationLoad: () => false,
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
    updateCuration: async ({ queries }, breakpoint) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      await breakpoint(100);
      clearFlashMessages();

      try {
        const response = await http.put(
          `/api/app_search/engines/${engineName}/curations/${props.curationId}`,
          {
            body: JSON.stringify({
              queries: queries || values.curation.queries,
              query: '', // TODO: activeQuery state
              promoted: [], // TODO: promotedIds state
              hidden: [], // TODO: hiddenIds state
            }),
          }
        );
        actions.onCurationLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
