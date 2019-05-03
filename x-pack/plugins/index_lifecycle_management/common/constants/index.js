/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const BASE_PATH = '/management/elasticsearch/index_lifecycle_management/';
export const PLUGIN_ID = 'index_lifecycle_management';
export {
  UIM_APP_NAME,
  UIM_APP_LOAD,
  UIM_POLICY_CREATE,
  UIM_POLICY_UPDATE,
  UIM_POLICY_DELETE,
  UIM_POLICY_ATTACH_INDEX,
  UIM_POLICY_ATTACH_INDEX_TEMPLATE,
  UIM_POLICY_DETACH_INDEX,
  UIM_CONFIG_COLD_PHASE,
  UIM_CONFIG_WARM_PHASE,
  UIM_CONFIG_SET_PRIORITY,
  UIM_CONFIG_FREEZE_INDEX,
  UIM_INDEX_RETRY_STEP,
  UIM_EDIT_CLICK,
} from './ui_metric';
