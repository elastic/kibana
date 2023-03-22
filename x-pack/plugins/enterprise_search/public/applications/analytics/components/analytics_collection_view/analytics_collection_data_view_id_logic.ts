/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';

import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  FetchAnalyticsCollectionDataViewIdAPILogic,
  FetchAnalyticsCollectionDataViewIdApiLogicResponse,
} from '../../api/fetch_analytics_collection_data_view_id/fetch_analytics_collection_data_view_id_api_logic';

export interface AnalyticsCollectionDataViewIdActions {
  apiSuccess: Actions<{}, FetchAnalyticsCollectionDataViewIdApiLogicResponse>['apiSuccess'];
  fetchAnalyticsCollectionDataViewId(name: string): { name: string };
  makeRequest: Actions<{}, FetchAnalyticsCollectionDataViewIdApiLogicResponse>['makeRequest'];
}
export interface AnalyticsCollectionDataViewIdValues {
  data: typeof FetchAnalyticsCollectionDataViewIdAPILogic.values.data;
  dataViewId: string | null;
  status: Status;
}

export const AnalyticsCollectionDataViewIdLogic = kea<
  MakeLogicType<AnalyticsCollectionDataViewIdValues, AnalyticsCollectionDataViewIdActions>
>({
  actions: {
    fetchAnalyticsCollectionDataViewId: (name) => ({ name }),
  },
  connect: {
    actions: [
      FetchAnalyticsCollectionDataViewIdAPILogic,
      ['makeRequest', 'apiSuccess', 'apiError'],
    ],
    values: [FetchAnalyticsCollectionDataViewIdAPILogic, ['status', 'data']],
  },
  listeners: ({ actions }) => ({
    fetchAnalyticsCollectionDataViewId: ({ name }) => {
      actions.makeRequest({ name });
    },
  }),
  path: ['enterprise_search', 'analytics', 'collection_data_view_id'],
  selectors: ({ selectors }) => ({
    dataViewId: [() => [selectors.data], (data) => data?.data_view_id || null],
  }),
});
