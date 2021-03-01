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
  setSuccessMessage,
  flashAPIErrors,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { updateMetaPageIndex } from '../../../shared/table_pagination';
import { EngineLogic } from '../engine';

import { DELETE_MESSAGE, SUCCESS_MESSAGE } from './constants';
import { Curation, CurationsAPIResponse } from './types';

interface CurationsValues {
  dataLoading: boolean;
  curations: Curation[];
  meta: Meta;
}

interface CurationsActions {
  onCurationsLoad(response: CurationsAPIResponse): CurationsAPIResponse;
  onPaginate(newPageIndex: number): { newPageIndex: number };
  loadCurations(): void;
  deleteCurationSet(id: string): string;
}

export const CurationsLogic = kea<MakeLogicType<CurationsValues, CurationsActions>>({
  path: ['enterprise_search', 'app_search', 'curations_logic'],
  actions: () => ({
    onCurationsLoad: ({ results, meta }) => ({ results, meta }),
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    loadCurations: true,
    deleteCurationSet: (id) => id,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadCurations: () => true,
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
        const response = await http.get(`/api/app_search/engines/${engineName}/curations`, {
          query: {
            'page[current]': meta.page.current,
            'page[size]': meta.page.size,
          },
        });
        actions.onCurationsLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteCurationSet: async (id) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      clearFlashMessages();

      if (window.confirm(DELETE_MESSAGE)) {
        try {
          await http.delete(`/api/app_search/engines/${engineName}/curations/${id}`);
          actions.loadCurations();
          setSuccessMessage(SUCCESS_MESSAGE);
        } catch (e) {
          flashAPIErrors(e);
        }
      }
    },
  }),
});
