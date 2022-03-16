/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SavedObject, SavedObjectAttributes } from 'src/core/public';

export type DeprecationSource = 'Kibana' | 'Elasticsearch';

export type ClusterUpgradeState = 'isPreparingForUpgrade' | 'isUpgrading' | 'isUpgradeComplete';

export interface ResponseError {
  statusCode: number;
  message: string | Error;
  attributes?: {
    allNodesUpgraded: boolean;
  };
}

export enum ReindexStep {
  // Enum values are spaced out by 10 to give us room to insert steps in between.
  created = 0,
  readonly = 20,
  newIndexCreated = 30,
  reindexStarted = 40,
  reindexCompleted = 50,
  aliasCreated = 60,
  originalIndexDeleted = 70,
  existingAliasesUpdated = 80,
}

export enum ReindexStatus {
  inProgress,
  completed,
  failed,
  paused,
  cancelled,
  // Used by the UI to differentiate if there was a failure retrieving
  // the status from the server API
  fetchFailed,
}

export interface ReindexStatusResponse {
  meta: {
    indexName: string;
    reindexName: string;
    // Array of aliases pointing to the index being reindexed
    aliases: string[];
  };
  warnings?: ReindexWarning[];
  reindexOp?: ReindexOperation;
  hasRequiredPrivileges?: boolean;
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
export type ReindexWarningTypes = 'customTypeName' | 'indexSetting' | 'replaceIndexWithAlias';

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

// Telemetry types
export type UIOpenOption = 'overview' | 'elasticsearch' | 'kibana';
export type UIReindexOption = 'close' | 'open' | 'start' | 'stop';

export interface UIOpen {
  overview: boolean;
  elasticsearch: boolean;
  kibana: boolean;
}

export interface UIReindex {
  close: boolean;
  open: boolean;
  start: boolean;
  stop: boolean;
}

export interface UpgradeAssistantTelemetry {
  features: {
    deprecation_logging: {
      enabled: boolean;
    };
  };
}

export type MIGRATION_DEPRECATION_LEVEL = 'none' | 'info' | 'warning' | 'critical';
export interface DeprecationInfo {
  level: MIGRATION_DEPRECATION_LEVEL;
  message: string;
  url: string;
  details?: string;
  _meta?: {
    [key: string]: string;
  };
}

export interface IndexSettingsDeprecationInfo {
  [indexName: string]: DeprecationInfo[];
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

export interface ClusterSettingAction {
  type: 'clusterSetting';
  deprecatedSettings: string[];
}

export interface EnrichedDeprecationInfo
  extends Omit<estypes.MigrationDeprecationsDeprecation, 'level'> {
  type: keyof estypes.MigrationDeprecationsResponse;
  isCritical: boolean;
  index?: string;
  correctiveAction?: ReindexAction | MlAction | IndexSettingAction | ClusterSettingAction;
  resolveDuringUpgrade: boolean;
}

export interface CloudBackupStatus {
  isBackedUp: boolean;
  lastBackupTime?: string;
}

export interface ESUpgradeStatus {
  totalCriticalDeprecations: number;
  deprecations: EnrichedDeprecationInfo[];
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

export interface DeprecationLoggingStatus {
  isDeprecationLogIndexingEnabled: boolean;
  isDeprecationLoggingEnabled: boolean;
}

export type MIGRATION_STATUS = 'MIGRATION_NEEDED' | 'NO_MIGRATION_NEEDED' | 'IN_PROGRESS' | 'ERROR';
export interface SystemIndicesMigrationFeature {
  id?: string;
  feature_name: string;
  minimum_index_version: string;
  migration_status: MIGRATION_STATUS;
  indices: Array<{
    index: string;
    version: string;
    failure_cause?: {
      error: {
        type: string;
        reason: string;
      };
    };
  }>;
}
export interface SystemIndicesMigrationStatus {
  features: SystemIndicesMigrationFeature[];
  migration_status: MIGRATION_STATUS;
}
export interface SystemIndicesMigrationStarted {
  features: SystemIndicesMigrationFeature[];
  accepted: boolean;
}
