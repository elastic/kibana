/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { apiService } from './utils';

const IM_API_PATH = '/api/ingest_manager';
const AGENT_CONFIGS_PATH = '/agent_configs';
const PACKAGE_CONFIGS_PATH = '/package_configs';

export const performCentralManagementOperations = async () => {
  return await apiService.get(IM_API_PATH + AGENT_CONFIGS_PATH);
};

export const postMonitorConfig = async (payload: any) => {
  return await apiService.post(IM_API_PATH + PACKAGE_CONFIGS_PATH, payload);
};
