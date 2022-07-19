/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';

import { GenerateApiKeyLogic } from '../../api/generate_api_key/generate_api_key_logic';
import { FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';

interface OverviewLogicActions {
  apiReset: typeof GenerateApiKeyLogic.actions.apiReset;
  closeGenerateModal: void;
  openGenerateModal: void;
  toggleClientsPopover: void;
  toggleManageApiKeyPopover: void;
}

interface OverviewLogicValues {
  apiKey: string;
  apiKeyData: typeof GenerateApiKeyLogic.values.data;
  apiKeyStatus: typeof GenerateApiKeyLogic.values.status;
  data: typeof FetchIndexApiLogic.values.data;
  indexData: typeof FetchIndexApiLogic.values.data;
  isClientsPopoverOpen: boolean;
  isGenerateModalOpen: boolean;
  isLoading: boolean;
  isManageKeysPopoverOpen: boolean;
  isSuccess: boolean;
  status: typeof FetchIndexApiLogic.values.status;
}

export const OverviewLogic = kea<MakeLogicType<OverviewLogicValues, OverviewLogicActions>>({
  actions: {
    closeGenerateModal: true,
    openGenerateModal: true,
    toggleClientsPopover: true,
    toggleManageApiKeyPopover: true,
  },
  connect: {
    actions: [GenerateApiKeyLogic, ['apiReset']],
    values: [
      FetchIndexApiLogic,
      ['data', 'status'],
      GenerateApiKeyLogic,
      ['data as apiKeyData', 'status as apiKeyStatus'],
    ],
  },
  listeners: ({ actions }) => ({
    openGenerateModal: () => {
      actions.apiReset();
    },
  }),
  path: ['enterprise_search', 'search_index', 'overview'],
  reducers: () => ({
    isClientsPopoverOpen: [
      false,
      {
        toggleClientsPopover: (state) => !state,
      },
    ],
    isGenerateModalOpen: [
      false,
      {
        closeGenerateModal: () => false,
        openGenerateModal: () => true,
      },
    ],
    isManageKeysPopoverOpen: [
      false,
      {
        openGenerateModal: () => false,
        toggleManageApiKeyPopover: (state) => !state,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    apiKey: [
      () => [selectors.apiKeyStatus, selectors.apiKeyData],
      (apiKeyStatus, apiKeyData) =>
        apiKeyStatus === Status.SUCCESS ? apiKeyData.apiKey.api_key : '',
    ],
    indexData: [() => [selectors.data], (data) => data],
    isLoading: [() => [selectors.status], (status) => status === Status.LOADING],
    isSuccess: [() => [selectors.status], (status) => status === Status.SUCCESS],
  }),
});
