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
