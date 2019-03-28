/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const UA_APP_NAME = 'index_lifecycle_management';

export const UA_APP_LOAD = 'app_load';
export const UA_POLICY_CREATE = 'policy_create';
export const UA_POLICY_UPDATE = 'policy_update';
export const UA_POLICY_DELETE = 'policy_delete';
export const UA_POLICY_ATTACH_INDEX = 'policy_attach_index';
export const UA_POLICY_ATTACH_INDEX_TEMPLATE = 'policy_attach_index_template';
export const UA_POLICY_DETACH_INDEX = 'policy_detach_index';
export const UA_CONFIG_COLD_PHASE = 'config_cold_phase';
export const UA_CONFIG_WARM_PHASE = 'config_warm_phase';
export const UA_CONFIG_SET_PRIORITY = 'config_set_priority';
export const UA_CONFIG_FREEZE_INDEX = 'config_freeze_index';
export const UA_INDEX_RETRY_STEP = 'index_retry_step';
export const UA_EDIT_CLICK = 'edit_click';

export const USER_ACTIONS = [
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
];
