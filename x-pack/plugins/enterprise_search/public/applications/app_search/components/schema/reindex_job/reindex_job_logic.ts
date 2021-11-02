/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../../shared/flash_messages';
import { HttpLogic } from '../../../../shared/http';
import { EngineLogic } from '../../engine';

import { ReindexJobApiResponse } from '../types';

export interface ReindexJobValues {
  dataLoading: boolean;
  fieldCoercionErrors: ReindexJobApiResponse['fieldCoercionErrors'];
}

export interface ReindexJobActions {
  loadReindexJob(id: string): string;
  onLoadSuccess(response: ReindexJobApiResponse): ReindexJobApiResponse;
  onLoadError(): void;
}

export const ReindexJobLogic = kea<MakeLogicType<ReindexJobValues, ReindexJobActions>>({
  path: ['enterprise_search', 'app_search', 'reindex_job_logic'],
  actions: {
    loadReindexJob: (id) => id,
    onLoadSuccess: (response) => response,
    onLoadError: true,
  },
  reducers: {
    dataLoading: [
      true,
      {
        loadReindexJob: () => true,
        onLoadSuccess: () => false,
        onLoadError: () => false,
      },
    ],
    fieldCoercionErrors: [
      {},
      {
        onLoadSuccess: (_, { fieldCoercionErrors }) => fieldCoercionErrors,
      },
    ],
  },
  listeners: ({ actions }) => ({
    loadReindexJob: async (id) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<ReindexJobApiResponse>(
          `/internal/app_search/engines/${engineName}/reindex_job/${id}`
        );
        actions.onLoadSuccess(response);
      } catch (e) {
        flashAPIErrors(e);
        actions.onLoadError();
      }
    },
  }),
});
