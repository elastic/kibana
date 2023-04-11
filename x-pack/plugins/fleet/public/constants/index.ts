/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  PLUGIN_ID,
  INTEGRATIONS_PLUGIN_ID,
  EPM_API_ROUTES,
  AGENT_API_ROUTES,
  SO_SEARCH_LIMIT,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  AGENTS_PREFIX,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  FLEET_SERVER_PACKAGE,
  // Fleet Server index
  AGENTS_INDEX,
  ENROLLMENT_API_KEYS_INDEX,
  // Preconfiguration
  AUTO_UPDATE_PACKAGES,
  KEEP_POLICIES_UP_TO_DATE_PACKAGES,
  AUTO_UPGRADE_POLICIES_PACKAGES,
} from '../../common/constants';

export * from './page_paths';

export const INDEX_NAME = '.kibana';

export const CUSTOM_LOGS_INTEGRATION_NAME = 'log';

export const DURATION_APM_SETTINGS_VARS = {
  IDLE_TIMEOUT: 'idle_timeout',
  READ_TIMEOUT: 'read_timeout',
  SHUTDOWN_TIMEOUT: 'shutdown_timeout',
  TAIL_SAMPLING_INTERVAL: 'tail_sampling_interval',
  WRITE_TIMEOUT: 'write_timeout',
};

export const LOCATORS_IDS = {
  APM_LOCATOR: 'APM_LOCATOR',
  DASHBOARD_APP: 'DASHBOARD_APP_LOCATOR',
} as const;

export const DASHBOARD_LOCATORS_IDS = {
  OVERVIEW: 'elastic_agent-a148dc70-6b3c-11ed-98de-67bdecd21824',
  AGENT_INFO: 'elastic_agent-0600ffa0-6b5e-11ed-98de-67bdecd21824',
  AGENT_METRICS: 'elastic_agent-f47f18cc-9c7d-4278-b2ea-a6dee816d395',
  INTEGRATIONS: 'elastic_agent-1a4e7280-6b5e-11ed-98de-67bdecd21824',
} as const;
