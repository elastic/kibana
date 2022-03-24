/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { DEFAULT_META } from '../../../shared/constants';
import {
  clearFlashMessages,
  flashSuccessToast,
  flashAPIErrors,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { ENGINE_CURATION_PATH } from '../../routes';
import { EngineLogic, generateEnginePath } from '../engine';

import { DELETE_CONFIRMATION_MESSAGE, DELETE_SUCCESS_MESSAGE } from './constants';
import { Curation, CurationsAPIResponse } from './types';

type CurationsPageTabs = 'overview' | 'settings' | 'history';

interface CurationsValues {
  dataLoading: boolean;
  curations: Curation[];
  meta: Meta;
  selectedPageTab: CurationsPageTabs;
}

interface CurationsActions {
  onCurationsLoad(response: CurationsAPIResponse): CurationsAPIResponse;
  onPaginate(newPageIndex: number): { newPageIndex: number };
  loadCurations(): void;
  deleteCuration(id: string): string;
  createCuration(queries: Curation['queries']): Curation['queries'];
  onSelectPageTab(pageTab: CurationsPageTabs): { pageTab: CurationsPageTabs };
}

export const CurationsLogic = kea<MakeLogicType<CurationsValues, CurationsActions>>({
  path: ['enterprise_search', 'app_search', 'curations_logic'],
  actions: () => ({
    onCurationsLoad: ({ results, meta }) => ({ results, meta }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    loadCurations: true,
    deleteCuration: (id) => id,
    createCuration: (queries) => queries,
    onSelectPageTab: (pageTab) => ({ pageTab }),
  }),
  reducers: () => ({
    selectedPageTab: [
      'overview',
      {
        onSelectPageTab: (_, { pageTab }) => pageTab,
      },
    ],
    dataLoading: [
      true,
      {
        onCurationsLoad: () => false,
      },
    ],
    curations: [
      [],
      {
        onCurationsLoad: (_, { results }) => results,
      },
    ],
    meta: [
      DEFAULT_META,
      {
        onCurationsLoad: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    loadCurations: async () => {
      const { meta } = values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<CurationsAPIResponse>(
          `/internal/app_search/engines/${engineName}/curations`,
          {
            query: {
              'page[current]': meta.page.current,
              'page[size]': meta.page.size,
            },
          }
        );
        actions.onCurationsLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteCuration: async (id) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      clearFlashMessages();

      if (window.confirm(DELETE_CONFIRMATION_MESSAGE)) {
        try {
          await http.delete(`/internal/app_search/engines/${engineName}/curations/${id}`);
          actions.loadCurations();
          flashSuccessToast(DELETE_SUCCESS_MESSAGE);
        } catch (e) {
          flashAPIErrors(e);
        }
      }
    },
    createCuration: async (queries) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      const { navigateToUrl } = KibanaLogic.values;
      clearFlashMessages();

      try {
        const response = await http.post<{ id: string }>(
          `/internal/app_search/engines/${engineName}/curations`,
          { body: JSON.stringify({ queries }) }
        );
        navigateToUrl(generateEnginePath(ENGINE_CURATION_PATH, { curationId: response.id }));
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    onSelectPageTab: () => {
      clearFlashMessages();
    },
  }),
});
