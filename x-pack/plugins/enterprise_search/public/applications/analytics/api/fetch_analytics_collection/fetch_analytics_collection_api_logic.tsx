/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type FetchAnalyticsCollectionApiLogicResponse = AnalyticsCollection;

export const fetchAnalyticsCollection = async ({ id }: { id: string }) => {
  const { http } = HttpLogic.values;
  const route = `/internal/enterprise_search/analytics/collections/${id}`;
  const response = await http.get<AnalyticsCollection>(route);

  return response;
};

export const FetchAnalyticsCollectionAPILogic = createApiLogic(
  ['analytics', 'analytics_collection_api_logic'],
  fetchAnalyticsCollection
);
