/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsCollection } from '../../../../../common/types/analytics';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type FetchAnalyticsCollectionsApiLogicResponse = AnalyticsCollection[];

export const fetchAnalyticsCollections = async () => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/analytics/collections';
  const response = await http.get<FetchAnalyticsCollectionsApiLogicResponse>(route);

  return response;
};

export const FetchAnalyticsCollectionsAPILogic = createApiLogic(
  ['analytics', 'analytics_collections_api_logic'],
  fetchAnalyticsCollections
);
