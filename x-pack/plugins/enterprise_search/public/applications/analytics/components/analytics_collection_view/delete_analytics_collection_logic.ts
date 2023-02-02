/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { Status } from '../../../../../common/types/api';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import { KibanaLogic } from '../../../shared/kibana';
import {
  DeleteAnalyticsCollectionAPILogic,
  DeleteAnalyticsCollectionApiLogicResponse,
} from '../../api/delete_analytics_collection/delete_analytics_collection_api_logic';
import { ROOT_PATH } from '../../routes';

export interface DeleteAnalyticsCollectionActions {
  apiSuccess: Actions<{}, DeleteAnalyticsCollectionApiLogicResponse>['apiSuccess'];
  deleteAnalyticsCollection(id: string): { id: string };
  makeRequest: Actions<{}, DeleteAnalyticsCollectionApiLogicResponse>['makeRequest'];
}
export interface DeleteAnalyticsCollectionValues {
  analyticsCollection: AnalyticsCollection;
  isLoading: boolean;
  status: Status;
}

export const DeleteAnalyticsCollectionLogic = kea<
  MakeLogicType<DeleteAnalyticsCollectionValues, DeleteAnalyticsCollectionActions>
>({
  actions: {
    deleteAnalyticsCollection: (id) => ({ id }),
  },
  connect: {
    actions: [DeleteAnalyticsCollectionAPILogic, ['makeRequest', 'apiSuccess']],
    values: [DeleteAnalyticsCollectionAPILogic, ['status']],
  },
  listeners: ({ actions }) => ({
    apiSuccess: async (_, breakpoint) => {
      // Wait for propagation of the collection deletion
      await breakpoint(1000);
      KibanaLogic.values.navigateToUrl(ROOT_PATH);
    },
    deleteAnalyticsCollection: ({ id }) => {
      actions.makeRequest({ id });
    },
  }),
  path: ['enterprise_search', 'analytics', 'collections', 'delete'],
  selectors: ({ selectors }) => ({
    isLoading: [
      () => [selectors.status],
      (status) => [Status.LOADING, Status.IDLE].includes(status),
    ],
  }),
});
