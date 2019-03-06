/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { PLUGIN } from './plugin';
export { BASE_PATH } from './base_path';
export * from './index_statuses';

export {
  UA_APP_NAME,
  USER_ACTIONS,
  UA_INDEX_CLEAR_CACHE,
  UA_INDEX_CLEAR_CACHE_BULK,
  UA_INDEX_DELETE,
  UA_INDEX_DELETE_BULK,
  UA_INDEX_FLUSH,
  UA_INDEX_FLUSH_BULK,
  UA_INDEX_FORCE_MERGE,
  UA_INDEX_FORCE_MERGE_BULK,
  UA_INDEX_CLOSE,
  UA_INDEX_CLOSE_BULK,
  UA_INDEX_OPEN,
  UA_INDEX_OPEN_BULK,
  UA_INDEX_FREEZE,
  UA_INDEX_FREEZE_BULK,
  UA_INDEX_UNFREEZE,
  UA_INDEX_UNFREEZE_BULK,
  UA_INDEX_SETTINGS_EDIT,
  UA_SHOW_DETAILS_CLICK,
  UA_DETAIL_PANEL_SUMMARY_TAB_CLICK,
  UA_DETAIL_PANEL_SETTINGS_TAB_CLICK,
  UA_DETAIL_PANEL_MAPPING_TAB_CLICK,
  UA_DETAIL_PANEL_STATS_TAB_CLICK,
  UA_DETAIL_PANEL_EDIT_SETTINGS_TAB_CLICK,
} from './user_action';
