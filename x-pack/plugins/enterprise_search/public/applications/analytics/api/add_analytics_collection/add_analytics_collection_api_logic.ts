/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface AddAnalyticsCollectionApiLogicArgs {
  name: string;
}

export type AddAnalyticsCollectionApiLogicResponse = AnalyticsCollection;

export const createAnalyticsCollection = async ({
  name,
}: AddAnalyticsCollectionApiLogicArgs): Promise<AddAnalyticsCollectionApiLogicResponse> => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/analytics/collections';
  const response = await http.post<AnalyticsCollection>(route, {
    body: JSON.stringify({ name }),
  });

  return response;
};

export const AddAnalyticsCollectionsAPILogic = createApiLogic(
  ['analytics', 'add_analytics_collections_api_logic'],
  createAnalyticsCollection
);
