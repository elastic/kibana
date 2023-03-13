/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../common/types/api';
import { GenerateEngineApiKeyLogic } from '../../../api/generate_engine_api_key/generate_engine_api_key_logic';

interface EngineAPIActions {
  apiError: typeof GenerateEngineApiKeyLogic.actions.apiError;
  apiReset: typeof GenerateEngineApiKeyLogic.actions.apiReset;
  closeGenerateModal: void;
  openGenerateModal: void;
}

export interface EngineAPILogicValues {
  apiKey: string;
  apiKeyData: typeof GenerateEngineApiKeyLogic.values.data;
  apiKeyStatus: typeof GenerateEngineApiKeyLogic.values.status;
  isError: boolean;
  isGenerateModalOpen: boolean;
}

export const EngineApiLogic = kea<MakeLogicType<EngineAPILogicValues, EngineAPIActions>>({
  actions: {
    closeGenerateModal: true,
    openGenerateModal: true,
  },
  connect: {
    actions: [GenerateEngineApiKeyLogic, ['apiReset']],
    values: [GenerateEngineApiKeyLogic, ['data as apiKeyData', 'status as apiKeyStatus']],
  },
  listeners: ({ actions }) => ({
    openGenerateModal: () => {
      actions.apiReset();
    },
  }),
  path: ['enterprise_search', 'content', 'engine_api_logic'],
  reducers: () => ({
    isGenerateModalOpen: [
      false,
      {
        closeGenerateModal: () => false,
        openGenerateModal: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    apiKey: [
      () => [selectors.apiKeyStatus, selectors.apiKeyData],
      (apiKeyStatus, apiKeyData) =>
        apiKeyStatus === Status.SUCCESS ? apiKeyData.apiKey.encoded : null,
    ],
  }),
});
