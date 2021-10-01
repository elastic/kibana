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
  AGENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  FLEET_SERVER_PACKAGE,
  // Fleet Server index
  AGENTS_INDEX,
  ENROLLMENT_API_KEYS_INDEX,
} from '../../common/constants';

export * from './page_paths';

export const INDEX_NAME = '.kibana';

export const CUSTOM_LOGS_INTEGRATION_NAME = 'log';
