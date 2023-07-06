/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../common/types/api';
import { Actions } from '../../../../shared/api_logic/create_api_logic';
import {
  AnalyticsEventsExistAPILogic,
  AnalyticsEventsExistApiLogicResponse,
} from '../../../api/check_analytics_events/check_analytics_events_exist_api_logic';

export interface AnalyticsCollectionNoEventsCalloutActions {
  apiSuccess: Actions<{}, AnalyticsEventsExistApiLogicResponse>['apiSuccess'];
  analyticsEventsExist(indexName: string): { indexName: string };
  makeRequest: Actions<{}, AnalyticsEventsExistApiLogicResponse>['makeRequest'];
}
export interface AnalyticsCollectionNoEventsCalloutValues {
  hasEvents: boolean;
  status: Status;
  isLoading: boolean;
  data: typeof AnalyticsEventsExistAPILogic.values.data;
}

export const AnalyticsCollectionNoEventsCalloutLogic = kea<
  MakeLogicType<AnalyticsCollectionNoEventsCalloutValues, AnalyticsCollectionNoEventsCalloutActions>
>({
  actions: {
    analyticsEventsExist: (indexName) => ({ indexName }),
  },
  connect: {
    actions: [AnalyticsEventsExistAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [AnalyticsEventsExistAPILogic, ['status', 'data']],
  },
  listeners: ({ actions }) => ({
    analyticsEventsExist: ({ indexName }) => {
      actions.makeRequest({ indexName });
    },
  }),
  path: ['enterprise_search', 'analytics', 'collection', 'events_exist'],
  selectors: ({ selectors }) => ({
    hasEvents: [
      () => [selectors.data],
      (data: AnalyticsCollectionNoEventsCalloutValues['data']) => data?.exists === true,
    ],
    isLoading: [
      () => [selectors.status],
      (status: AnalyticsCollectionNoEventsCalloutValues['status']) => status === Status.LOADING,
    ],
  }),
});
