/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';
import { KibanaLogic } from '../../../shared/kibana';

import { GenerateApiKeyLogic } from '../../api/generate_api_key/generate_api_key_logic';
import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicActions,
} from '../../api/index/cached_fetch_index_api_logic';

import { SEARCH_INDICES_PATH } from '../../routes';

interface OverviewLogicActions {
  apiError: CachedFetchIndexApiLogicActions['apiError'];
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
  indexData: typeof CachedFetchIndexApiLogic.values.indexData;
  isClientsPopoverOpen: boolean;
  isError: boolean;
  isGenerateModalOpen: boolean;
  isLoading: boolean;
  isManageKeysPopoverOpen: boolean;
  status: typeof CachedFetchIndexApiLogic.values.status;
}

export const OverviewLogic = kea<MakeLogicType<OverviewLogicValues, OverviewLogicActions>>({
  actions: {
    closeGenerateModal: true,
    openGenerateModal: true,
    toggleClientsPopover: true,
    toggleManageApiKeyPopover: true,
  },
  connect: {
    actions: [CachedFetchIndexApiLogic, ['apiError'], GenerateApiKeyLogic, ['apiReset']],
    values: [
      CachedFetchIndexApiLogic,
      ['indexData', 'status'],
      GenerateApiKeyLogic,
      ['data as apiKeyData', 'status as apiKeyStatus'],
    ],
  },
  listeners: ({ actions }) => ({
    apiError: async (_, breakpoint) => {
      // show error for a second before navigating away
      await breakpoint(1000);
      KibanaLogic.values.navigateToUrl(SEARCH_INDICES_PATH);
    },
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
        apiKeyStatus === Status.SUCCESS ? apiKeyData.apiKey.encoded : '',
    ],
    isError: [() => [selectors.status], (status) => status === Status.ERROR],
    isLoading: [
      () => [selectors.status, selectors.indexData],
      (status, data) =>
        status === Status.IDLE || (typeof data === 'undefined' && status === Status.LOADING),
    ],
  }),
});
