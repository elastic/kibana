/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';
import { FetchEngineApiLogic } from '../../api/engines/fetch_engine_api_logic';
import { EngineViewActions, EngineViewLogic, EngineViewValues } from '../engine/engine_view_logic';

export interface EngineListFlyoutValues {
  isFetchEngineLoading: EngineViewValues['isLoadingEngine'];
  isFetchEngineFlyoutVisible: boolean;
  fetchEngineData: EngineViewValues['engineData']; // data from fetchEngineAPI
  fetchEngineName: string | null;
  fetchEngineApiError?: EngineViewValues['fetchEngineApiError'];
  fetchEngineApiStatus: EngineViewValues['fetchEngineApiStatus'];
}
export interface EngineListFlyoutActions {
  closeFetchIndicesFlyout(): void;
  fetchEngineData: EngineViewActions['fetchEngine'] | null;
  openFetchEngineFlyout: (engineName: string) => { engineName: string };
}

export const EnginesListFlyoutLogic = kea<
  MakeLogicType<EngineListFlyoutValues, EngineListFlyoutActions>
>({
  connect: {
    actions: [EngineViewLogic, ['fetchEngine as fetchEngine']],
    values: [
      EngineViewLogic,
      [
        'engineData as fetchEngineData',
        'fetchEngineApiError as fetchEngineApiError',
        'fetchEngineApiStatus as fetchEngineApiStatus',
      ],
    ],
  },
  actions: {
    closeFetchIndicesFlyout: true,
    openFetchEngineFlyout: (engineName) => ({ engineName }),
  },
  path: ['enterprise_search', 'content', 'engine_list_flyout_logic'],
  reducers: ({}) => ({
    fetchEngineName: [
      null,
      {
        closeFetchIndicesFlyout: () => null,
        openFetchEngineFlyout: (_, { engineName }) => engineName,
      },
    ],
    isFetchEngineFlyoutVisible: [
      false,
      {
        closeFetchIndicesFlyout: () => false,
        openFetchEngineFlyout: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isFetchEngineLoading: [
      () => [selectors.fetchEngineApiStatus],
      (status: EngineListFlyoutValues['fetchEngineApiStatus']) => [Status.LOADING].includes(status),
    ],
  }),
  listeners: ({}) => ({
    openFetchEngineFlyout: async (input) => {
      FetchEngineApiLogic.actions.makeRequest(input);
    },
  }),
});
