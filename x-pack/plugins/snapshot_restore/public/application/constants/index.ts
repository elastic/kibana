/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DAY } from '../../shared_imports';

export const BASE_PATH = '';
export const DEFAULT_SECTION: Section = 'snapshots';
export type Section = 'repositories' | 'snapshots' | 'restore_status' | 'policies';

// Set a minimum request duration to avoid strange UI flickers
export const MINIMUM_TIMEOUT_MS = 300;

export enum REPOSITORY_DOC_PATHS {
  default = 'snapshot-restore.html',
  fs = 'snapshots-register-repository.html#snapshots-filesystem-repository',
  url = 'snapshots-register-repository.html#snapshots-read-only-repository',
  source = 'snapshots-register-repository.html#snapshots-source-only-repository',
  s3 = 'repository-s3.html',
  hdfs = 'repository-hdfs.html',
  azure = 'repository-azure.html',
  gcs = 'repository-gcs.html',
  plugins = 'repository.html',
}

export enum SNAPSHOT_STATE {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  INCOMPATIBLE = 'INCOMPATIBLE',
}

const INDEX_SETTING_SUGGESTIONS: string[] = [
  'index.number_of_shards',
  'index.shard.check_on_startup',
  'index.codec',
  'index.routing_partition_size',
  'index.load_fixed_bitset_filters_eagerly',
  'index.number_of_replicas',
  'index.auto_expand_replicas',
  'index.search.idle.after',
  'index.refresh_interval',
  'index.max_result_window',
  'index.max_inner_result_window',
  'index.max_rescore_window',
  'index.max_docvalue_fields_search',
  'index.max_script_fields',
  'index.max_ngram_diff',
  'index.max_shingle_diff',
  'index.blocks.read_only',
  'index.blocks.read_only_allow_delete',
  'index.blocks.read',
  'index.blocks.write',
  'index.blocks.metadata',
  'index.max_refresh_listeners',
  'index.analyze.max_token_count',
  'index.highlight.max_analyzed_offset',
  'index.max_terms_count',
  'index.max_regex_length',
  'index.routing.allocation.enable',
  'index.routing.rebalance.enable',
  'index.gc_deletes',
  'index.default_pipeline',
];

export const UNMODIFIABLE_INDEX_SETTINGS: string[] = [
  'index.number_of_shards',
  'index.version.created',
  'index.uuid',
  'index.creation_date',
];

export const UNREMOVABLE_INDEX_SETTINGS: string[] = [
  ...UNMODIFIABLE_INDEX_SETTINGS,
  'index.number_of_replicas',
  'index.auto_expand_replicas',
  'index.version.upgraded',
];

export const MODIFY_INDEX_SETTINGS_SUGGESTIONS: string[] = INDEX_SETTING_SUGGESTIONS.filter(
  (setting) => !UNMODIFIABLE_INDEX_SETTINGS.includes(setting)
);

export const REMOVE_INDEX_SETTINGS_SUGGESTIONS: string[] = INDEX_SETTING_SUGGESTIONS.filter(
  (setting) => !UNREMOVABLE_INDEX_SETTINGS.includes(setting)
);

export const DEFAULT_POLICY_SCHEDULE = '0 30 1 * * ?';
export const DEFAULT_POLICY_FREQUENCY = DAY;

export const DEFAULT_RETENTION_SCHEDULE = '0 30 1 * * ?';
export const DEFAULT_RETENTION_FREQUENCY = DAY;

// UI Metric constants
export const UIM_APP_NAME = 'snapshot_restore';
export const UIM_REPOSITORY_LIST_LOAD = 'repository_list_load';
export const UIM_REPOSITORY_CREATE = 'repository_create';
export const UIM_REPOSITORY_UPDATE = 'repository_update';
export const UIM_REPOSITORY_DELETE = 'repository_delete';
export const UIM_REPOSITORY_DELETE_MANY = 'repository_delete_many';
export const UIM_REPOSITORY_SHOW_DETAILS_CLICK = 'repository_show_details_click';
export const UIM_REPOSITORY_DETAIL_PANEL_VERIFY = 'repository_detail_panel_verify';
export const UIM_REPOSITORY_DETAIL_PANEL_CLEANUP = 'repository_detail_panel_cleanup';
export const UIM_SNAPSHOT_LIST_LOAD = 'snapshot_list_load';
export const UIM_SNAPSHOT_SHOW_DETAILS_CLICK = 'snapshot_show_details_click';
export const UIM_SNAPSHOT_DETAIL_PANEL_SUMMARY_TAB = 'snapshot_detail_panel_summary_tab';
export const UIM_SNAPSHOT_DETAIL_PANEL_FAILED_INDICES_TAB =
  'snapshot_detail_panel_failed_indices_tab';
export const UIM_SNAPSHOT_DELETE = 'snapshot_delete';
export const UIM_SNAPSHOT_DELETE_MANY = 'snapshot_delete_many';
export const UIM_RESTORE_CREATE = 'restore_create';
export const UIM_RESTORE_LIST_LOAD = 'restore_list_load';
export const UIM_RESTORE_LIST_EXPAND_INDEX = 'restore_list_expand_index';
export const UIM_POLICY_LIST_LOAD = 'policy_list_load';
export const UIM_POLICY_SHOW_DETAILS_CLICK = 'policy_show_details_click';
export const UIM_POLICY_DETAIL_PANEL_SUMMARY_TAB = 'policy_detail_panel_summary_tab';
export const UIM_POLICY_DETAIL_PANEL_HISTORY_TAB = 'policy_detail_panel_last_success_tab';
export const UIM_POLICY_EXECUTE = 'policy_execute';
export const UIM_POLICY_DELETE = 'policy_delete';
export const UIM_POLICY_DELETE_MANY = 'policy_delete_many';
export const UIM_POLICY_CREATE = 'policy_create';
export const UIM_POLICY_UPDATE = 'policy_update';
export const UIM_RETENTION_SETTINGS_UPDATE = 'retention_settings_update';
export const UIM_RETENTION_EXECUTE = 'retention_execute';
