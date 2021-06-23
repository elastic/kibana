/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectAttributes } from 'src/core/public';

export enum ReindexStep {
  // Enum values are spaced out by 10 to give us room to insert steps in between.
  created = 0,
  indexGroupServicesStopped = 10,
  readonly = 20,
  newIndexCreated = 30,
  reindexStarted = 40,
  reindexCompleted = 50,
  aliasCreated = 60,
  indexGroupServicesStarted = 70,
}

export enum ReindexStatus {
  inProgress,
  completed,
  failed,
  paused,
  cancelled,
}

export const REINDEX_OP_TYPE = 'upgrade-assistant-reindex-operation';
export interface QueueSettings extends SavedObjectAttributes {
  /**
   * A Unix timestamp of when the reindex operation was enqueued.
   *
   * @remark
   * This is used by the reindexing scheduler to determine execution
   * order.
   */
  queuedAt: number;

  /**
   * A Unix timestamp of when the reindex operation was started.
   *
   * @remark
   * Updating this field is useful for _also_ updating the saved object "updated_at" field
   * which is used to determine stale or abandoned reindex operations.
   *
   * For now this is used by the reindex worker scheduler to determine whether we have
   * A queue item at the start of the queue.
   *
   */
  startedAt?: number;
}

export interface ReindexOptions extends SavedObjectAttributes {
  /**
   * Whether to treat the index as if it were closed. This instructs the
   * reindex strategy to first open the index, perform reindexing and
   * then close the index again.
   */
  openAndClose?: boolean;

  /**
   * Set this key to configure a reindex operation as part of a
   * batch to be run in series.
   */
  queueSettings?: QueueSettings;
}

export interface ReindexOperation extends SavedObjectAttributes {
  indexName: string;
  newIndexName: string;
  status: ReindexStatus;
  lastCompletedStep: ReindexStep;
  locked: string | null;
  reindexTaskId: string | null;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
  // This field is only used for the singleton IndexConsumerType documents.
  runningReindexCount: number | null;

  /**
   * Options for the reindexing strategy.
   *
   * @remark
   * Marked as optional for backwards compatibility. We should still
   * be able to handle older ReindexOperation objects.
   */
  reindexOptions?: ReindexOptions;
}

export type ReindexSavedObject = SavedObject<ReindexOperation>;

// 7.0 -> 8.0 warnings
export type ReindexWarningTypes = 'customTypeName' | 'indexSetting';
export interface ReindexWarning {
  warningType: ReindexWarningTypes;
  /**
   * Optional metadata for deprecations
   *
   * @remark
   * For example, for the "customTypeName" deprecation,
   * we want to surface the typeName to the user.
   * For "indexSetting" we want to surface the deprecated settings.
   */
  meta?: {
    [key: string]: string | string[];
  };
}

export enum IndexGroup {
  ml = '___ML_REINDEX_LOCK___',
  watcher = '___WATCHER_REINDEX_LOCK___',
}

// Telemetry types
export const UPGRADE_ASSISTANT_TYPE = 'upgrade-assistant-telemetry';
export const UPGRADE_ASSISTANT_DOC_ID = 'upgrade-assistant-telemetry';
export type UIOpenOption = 'overview' | 'cluster' | 'indices' | 'kibana';
export type UIReindexOption = 'close' | 'open' | 'start' | 'stop';

export interface UIOpen {
  overview: boolean;
  cluster: boolean;
  indices: boolean;
  kibana: boolean;
}

export interface UIReindex {
  close: boolean;
  open: boolean;
  start: boolean;
  stop: boolean;
}

export interface UpgradeAssistantTelemetrySavedObject {
  ui_open: {
    overview: number;
    cluster: number;
    indices: number;
    kibana: number;
  };
  ui_reindex: {
    close: number;
    open: number;
    start: number;
    stop: number;
  };
}

export interface UpgradeAssistantTelemetry {
  ui_open: {
    overview: number;
    cluster: number;
    indices: number;
    kibana: number;
  };
  ui_reindex: {
    close: number;
    open: number;
    start: number;
    stop: number;
  };
  features: {
    deprecation_logging: {
      enabled: boolean;
    };
  };
}

export interface UpgradeAssistantTelemetrySavedObjectAttributes {
  [key: string]: any;
}

export type MIGRATION_DEPRECATION_LEVEL = 'none' | 'info' | 'warning' | 'critical';
export interface DeprecationInfo {
  level: MIGRATION_DEPRECATION_LEVEL;
  message: string;
  url: string;
  details?: string;
}

export interface IndexSettingsDeprecationInfo {
  [indexName: string]: DeprecationInfo[];
}
export interface DeprecationAPIResponse {
  cluster_settings: DeprecationInfo[];
  ml_settings: DeprecationInfo[];
  node_settings: DeprecationInfo[];
  index_settings: IndexSettingsDeprecationInfo;
}

export interface ReindexAction {
  type: 'reindex';
  /**
   * Indicate what blockers have been detected for calling reindex
   * against this index.
   *
   * @remark
   * In future this could be an array of blockers.
   */
  blockerForReindexing?: 'index-closed'; // 'index-closed' can be handled automatically, but requires more resources, user should be warned
}

export interface MlAction {
  type: 'mlSnapshot';
  snapshotId: string;
  jobId: string;
}

export interface IndexSettingAction {
  type: 'indexSetting';
  deprecatedSettings: string[];
}
export interface EnrichedDeprecationInfo extends DeprecationInfo {
  index?: string;
  correctiveAction?: ReindexAction | MlAction | IndexSettingAction;
}

export interface UpgradeAssistantStatus {
  readyForUpgrade: boolean;
  cluster: EnrichedDeprecationInfo[];
  indices: EnrichedDeprecationInfo[];
}

export interface ResolveIndexResponseFromES {
  indices: Array<{
    name: string;
    // per https://github.com/elastic/elasticsearch/pull/57626
    attributes: Array<'open' | 'closed' | 'hidden' | 'frozen'>;
    aliases?: string[];
    data_stream?: string;
  }>;
  aliases: Array<{
    name: string;
    indices: string[];
  }>;
  data_streams: Array<{ name: string; backing_indices: string[]; timestamp_field: string }>;
}

export const ML_UPGRADE_OP_TYPE = 'upgrade-assistant-ml-upgrade-operation';

export interface MlOperation extends SavedObjectAttributes {
  nodeId: string;
  snapshotId: string;
  jobId: string;
}
