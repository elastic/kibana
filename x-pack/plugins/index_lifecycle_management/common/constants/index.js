/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/elasticsearch/index_lifecycle_management/';
export const PLUGIN_ID = 'index_lifecycle_management';
export {
  UA_APP_NAME,
  USER_ACTIONS,
  UA_APP_LOAD,
  UA_POLICY_CREATE,
  UA_POLICY_UPDATE,
  UA_POLICY_DELETE,
  UA_POLICY_ATTACH_INDEX,
  UA_POLICY_ATTACH_INDEX_TEMPLATE,
  UA_POLICY_DETACH_INDEX,
  UA_CONFIG_COLD_PHASE,
  UA_CONFIG_WARM_PHASE,
  UA_CONFIG_SET_PRIORITY,
  UA_CONFIG_FREEZE_INDEX,
  UA_INDEX_RETRY_STEP,
  UA_EDIT_CLICK,
} from './user_action';
