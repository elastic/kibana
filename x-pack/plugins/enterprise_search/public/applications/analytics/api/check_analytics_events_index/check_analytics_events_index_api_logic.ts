/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsEventsIndexExists } from '../../../../../common/types/analytics';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface AnalyticsEventsIndexExistsApiLogicArgs {
  indexName: string;
}

export type AnalyticsEventsIndexExistsApiLogicResponse = AnalyticsEventsIndexExists;

export const checkAnalyticsEventsIndexExists = async ({
  indexName,
}: AnalyticsEventsIndexExistsApiLogicArgs): Promise<AnalyticsEventsIndexExistsApiLogicResponse> => {
  const { http } = HttpLogic.values;
  const route = `/internal/enterprise_search/analytics/events/${indexName}/exists`;
  const response = await http.get<AnalyticsEventsIndexExists>(route);

  return response;
};

export const AnalyticsEventsIndexExistsAPILogic = createApiLogic(
  ['analytics', 'analytics_events_index_exists_api_logic'],
  checkAnalyticsEventsIndexExists
);
