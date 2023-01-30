/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type DeleteAnalyticsCollectionApiLogicResponse = void;

export const deleteAnalyticsCollection = async ({ id }: { id: string }) => {
  const { http } = HttpLogic.values;
  const route = `/internal/enterprise_search/analytics/collections/${id}`;
  await http.delete<DeleteAnalyticsCollectionApiLogicResponse>(route);

  return;
};

export const DeleteAnalyticsCollectionAPILogic = createApiLogic(
  ['analytics', 'delete_analytics_collection_api_logic'],
  deleteAnalyticsCollection,
  {
    showSuccessFlashFn: () =>
      i18n.translate('xpack.enterpriseSearch.analytics.collectionsDelete.action.successMessage', {
        defaultMessage: 'The collection has been successfully deleted',
      }),
  }
);
