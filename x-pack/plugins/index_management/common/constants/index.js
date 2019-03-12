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
  UA_APP_LOAD,
  USER_ACTIONS,
  UA_UPDATE_SETTINGS,
  UA_INDEX_CLEAR_CACHE,
  UA_INDEX_CLEAR_CACHE_MANY,
  UA_INDEX_CLOSE,
  UA_INDEX_CLOSE_MANY,
  UA_INDEX_DELETE,
  UA_INDEX_DELETE_MANY,
  UA_INDEX_FLUSH,
  UA_INDEX_FLUSH_MANY,
  UA_INDEX_FORCE_MERGE,
  UA_INDEX_FORCE_MERGE_MANY,
  UA_INDEX_FREEZE,
  UA_INDEX_FREEZE_MANY,
  UA_INDEX_OPEN,
  UA_INDEX_OPEN_MANY,
  UA_INDEX_REFRESH,
  UA_INDEX_REFRESH_MANY,
  UA_INDEX_UNFREEZE,
  UA_INDEX_UNFREEZE_MANY,
  UA_INDEX_SETTINGS_EDIT,
  UA_SHOW_DETAILS_CLICK,
  UA_DETAIL_PANEL_SUMMARY_TAB,
  UA_DETAIL_PANEL_SETTINGS_TAB,
  UA_DETAIL_PANEL_MAPPING_TAB,
  UA_DETAIL_PANEL_STATS_TAB,
  UA_DETAIL_PANEL_EDIT_SETTINGS_TAB,
} from './user_action';
