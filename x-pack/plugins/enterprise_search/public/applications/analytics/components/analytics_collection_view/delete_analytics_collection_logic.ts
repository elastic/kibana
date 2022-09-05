/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { Actions } from '../../../shared/api_logic/create_api_logic';
import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { Status } from '../../../../../common/types/api';
import {
  flashAPIErrors,
  clearFlashMessages,
  flashSuccessToast,
} from '../../../shared/flash_messages';
import { KibanaLogic } from '../../../shared/kibana';
import { DeleteAnalyticsCollectionAPILogic, DeleteAnalyticsCollectionApiLogicResponse } from '../../api/delete_analytics_collection/delete_analytics_collection_api_logic';
import { ROOT_PATH } from '../../routes';

export interface DeleteAnalyticsCollectionActions {
  apiError: Actions<{}, DeleteAnalyticsCollectionApiLogicResponse>['apiError'];
  apiSuccess: Actions<{}, DeleteAnalyticsCollectionApiLogicResponse>['apiSuccess'];
  deleteAnalyticsCollection(name: string): AnalyticsCollection;
  makeRequest: Actions<{}, DeleteAnalyticsCollectionApiLogicResponse>['makeRequest'];
}
export interface DeleteAnalyticsCollectionValues {
  analyticsCollection: AnalyticsCollection;
  data: typeof DeleteAnalyticsCollectionAPILogic.values.data;
  isLoading: boolean;
  status: typeof DeleteAnalyticsCollectionAPILogic.values.status;
}

export const DeleteAnalyticsCollectionLogic = kea<
  MakeLogicType<DeleteAnalyticsCollectionValues, DeleteAnalyticsCollectionActions>
>({
  actions: {
    deleteAnalyticsCollection: (name) => ({ name }),
  },
  connect: {
    actions: [DeleteAnalyticsCollectionAPILogic, ['makeRequest', 'apiSuccess', 'apiError']],
    values: [DeleteAnalyticsCollectionAPILogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    apiError: (e) => flashAPIErrors(e),
    apiSuccess: async ({}, breakpoint) => {
      flashSuccessToast(
        i18n.translate('xpack.enterpriseSearch.analytics.collectionsDelete.action.successMessage', {
          defaultMessage: "The collection has been successfully deleted",
        })
      );
      // Wait for propagation of the new collection
      await breakpoint(1000);
      KibanaLogic.values.navigateToUrl(ROOT_PATH);
    },
    deleteAnalyticsCollection: ({ name }) => {
      actions.makeRequest({ name });
    },
    makeRequest: () => clearFlashMessages(),
  }),
  path: ['enterprise_search', 'analytics', 'collections', 'delete'],
  selectors: ({ selectors }) => ({
    analyticsCollection: [() => [selectors.data], (data) => data || {}],
    isLoading: [
      () => [selectors.status],
      (status) => [Status.LOADING, Status.IDLE].includes(status),
    ],
  }),
});
