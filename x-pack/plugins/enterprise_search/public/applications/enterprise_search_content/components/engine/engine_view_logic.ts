/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';

import {
  FetchEngineApiLogic,
  FetchEngineApiLogicActions,
} from '../../api/engines/fetch_engine_api_logic';

import { ENGINES_PATH } from '../../routes';

import { EnginesListLogic, EnginesListActions } from '../engines/engines_list_logic';

import { EngineNameLogic } from './engine_name_logic';

export interface EngineViewActions {
  closeDeleteEngineModal(): void;
  deleteSuccess: EnginesListActions['deleteSuccess'];
  fetchEngine: FetchEngineApiLogicActions['makeRequest'];
  openDeleteEngineModal(): void;
}

export interface EngineViewValues {
  engineData: typeof FetchEngineApiLogic.values.data;
  engineName: typeof EngineNameLogic.values.engineName;
  fetchEngineApiError?: typeof FetchEngineApiLogic.values.error;
  fetchEngineApiStatus: typeof FetchEngineApiLogic.values.status;
  isDeleteModalVisible: boolean;
  isLoadingEngine: boolean;
}

export const EngineViewLogic = kea<MakeLogicType<EngineViewValues, EngineViewActions>>({
  connect: {
    actions: [
      FetchEngineApiLogic,
      ['makeRequest as fetchEngine'],
      EnginesListLogic,
      ['deleteSuccess'],
    ],
    values: [
      EngineNameLogic,
      ['engineName'],
      FetchEngineApiLogic,
      ['data as engineData', 'status as fetchEngineApiStatus', 'error as fetchEngineApiError'],
    ],
  },
  actions: {
    closeDeleteEngineModal: true,
    openDeleteEngineModal: true,
  },
  listeners: ({ actions }) => ({
    deleteSuccess: () => {
      actions.closeDeleteEngineModal();
      KibanaLogic.values.navigateToUrl(ENGINES_PATH);
    },
  }),
  path: ['enterprise_search', 'content', 'engine_view_logic'],
  reducers: () => ({
    isDeleteModalVisible: [
      false,
      {
        closeDeleteEngineModal: () => false,
        openDeleteEngineModal: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isLoadingEngine: [
      () => [selectors.fetchEngineApiStatus, selectors.engineData],
      (status: EngineViewValues['fetchEngineApiStatus'], data: EngineViewValues['engineData']) => {
        return status === Status.IDLE || (!data && status === Status.LOADING);
      },
    ],
  }),
});
