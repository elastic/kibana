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
  fetchEngineApiStatus: typeof FetchEngineApiLogic.values.apiStatus;
  isLoadingEngine: boolean;
}

export const EngineViewLogic = kea<MakeLogicType<EngineViewValues, EngineViewActions>>({
  connect: {
    actions: [FetchEngineApiLogic, ['makeRequest as fetchEngine']],
    values: [
      EngineNameLogic,
      ['engineName'],
      FetchEngineApiLogic,
      ['data as engineData', 'apiStatus as fetchEngineApiStatus'],
    ],
  },
  path: ['enterprise_search', 'content', 'engine_view_logic'],
  selectors: ({ selectors }) => ({
    isLoadingEngine: [
      () => [selectors.fetchEngineApiStatus, selectors.engineData],
      (
        apiStatus: EngineViewValues['fetchEngineApiStatus'],
        data: EngineViewValues['engineData']
      ) => {
        return apiStatus.status === Status.IDLE || (!data && apiStatus.status === Status.LOADING);
      },
    ],
  }),
});
