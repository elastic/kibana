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
  AnalyticsEventsIndexExistsAPILogic,
  AnalyticsEventsIndexExistsApiLogicResponse,
} from '../../api/check_analytics_events_index/check_analytics_events_index_api_logic';

export interface AnalyticsEventsIndexExistsActions {
  apiSuccess: Actions<{}, AnalyticsEventsIndexExistsApiLogicResponse>['apiSuccess'];
  analyticsEventsIndexExists(indexName: string): { indexName: string };
  makeRequest: Actions<{}, AnalyticsEventsIndexExistsApiLogicResponse>['makeRequest'];
}
export interface AnalyticsEventsIndexExistsValues {
  isLoading: boolean;
  isPresent: boolean;
  status: Status;
  data: typeof AnalyticsEventsIndexExistsAPILogic.values.data;
}

export const AnalyticsEventsIndexExistsLogic = kea<
  MakeLogicType<AnalyticsEventsIndexExistsValues, AnalyticsEventsIndexExistsActions>
>({
  actions: {
    analyticsEventsIndexExists: (indexName) => ({ indexName }),
  },
  connect: {
    actions: [AnalyticsEventsIndexExistsAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [AnalyticsEventsIndexExistsAPILogic, ['status', 'data']],
  },
  listeners: ({ actions }) => ({
    analyticsEventsIndexExists: ({ indexName }) => {
      actions.makeRequest({ indexName });
    },
  }),
  path: ['enterprise_search', 'analytics', 'events_index'],
  selectors: ({ selectors }) => ({
    isLoading: [
      () => [selectors.status],
      (status) => [Status.LOADING, Status.IDLE].includes(status),
    ],
    isPresent: [() => [selectors.data], (data) => data?.exists === true],
  }),
});
