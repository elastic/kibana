/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudHealth } from '../../../../../common/stats';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type FetchCloudHealthResponse = CloudHealth;

export const fetchCloudHealth = async () => {
  const route = '/internal/enterprise_search/stats/cloud_health';
  return await HttpLogic.values.http.get<FetchCloudHealthResponse>(route);
};

export const FetchCloudHealthApiLogic = createApiLogic(
  ['enterprise_search_content', 'fetch_cloud_health_api_logic'],
  fetchCloudHealth
);
