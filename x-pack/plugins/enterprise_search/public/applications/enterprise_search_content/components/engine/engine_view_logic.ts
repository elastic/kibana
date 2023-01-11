/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';

import {
  FetchEngineApiLogic,
  FetchEngineApiLogicActions,
} from '../../api/engines/fetch_engine_api_logic';

import { EngineNameLogic } from './engine_name_logic';

export interface EngineViewActions {
  fetchEngine: FetchEngineApiLogicActions['makeRequest'];
}

export interface EngineViewValues {
  engineData: typeof FetchEngineApiLogic.values.data;
  engineName: typeof EngineNameLogic.values.engineName;
  fetchEngineApiError?: typeof FetchEngineApiLogic.values.error;
  fetchEngineApiStatus: typeof FetchEngineApiLogic.values.status;
  isLoadingEngine: boolean;
}

export const EngineViewLogic = kea<MakeLogicType<EngineViewValues, EngineViewActions>>({
  connect: {
    actions: [FetchEngineApiLogic, ['makeRequest as fetchEngine']],
    values: [
      EngineNameLogic,
      ['engineName'],
      FetchEngineApiLogic,
      ['data as engineData', 'status as fetchEngineApiStatus', 'error as fetchEngineApiError'],
    ],
  },
  path: ['enterprise_search', 'content', 'engine_view_logic'],
  selectors: ({ selectors }) => ({
    isLoadingEngine: [
      () => [selectors.fetchEngineApiStatus, selectors.engineData],
      (status: EngineViewValues['fetchEngineApiStatus'], data: EngineViewValues['engineData']) => {
        return status === Status.IDLE || (!data && status === Status.LOADING);
      },
    ],
  }),
});
