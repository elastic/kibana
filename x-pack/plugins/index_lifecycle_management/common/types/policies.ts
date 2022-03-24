/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Index as IndexInterface } from '../../../index_management/common/types';

export type Phase = keyof Phases;

export type PhaseWithAllocation = 'warm' | 'cold';

export type PhaseWithTiming = keyof Omit<Phases, 'hot'>;

export type PhaseExceptDelete = keyof Omit<Phases, 'delete'>;

export interface SerializedPolicy {
  name: string;
  phases: Phases;
  _meta?: Record<string, any>;
}

export interface Phases {
  hot?: SerializedHotPhase;
  warm?: SerializedWarmPhase;
  cold?: SerializedColdPhase;
  frozen?: SerializedFrozenPhase;
  delete?: SerializedDeletePhase;
}

export interface PolicyFromES {
  modifiedDate: string;
  name: string;
  policy: SerializedPolicy;
  version: number;
  indices?: string[];
  dataStreams?: string[];
  indexTemplates?: string[];
}

export interface SerializedPhase {
  min_age?: string;
  actions: {
    [action: string]: any;
  };
}

export interface MigrateAction {
  /**
   * If enabled is ever set it will probably only be set to `false` because the default value
   * for this is `true`. Rather leave unspecified for true when serialising.
   */
  enabled: boolean;
}

export interface SerializedActionWithAllocation {
  allocate?: AllocateAction;
  migrate?: MigrateAction;
}

export type SearchableSnapshotStorage = 'full_copy' | 'shared_cache';

export interface SearchableSnapshotAction {
  snapshot_repository: string;
  /**
   * We do not configure this value in the UI as it is an advanced setting that will
   * not suit the vast majority of cases.
   */
  force_merge_index?: boolean;
  /**
   * This configuration lets the user create full or partial searchable snapshots.
   * Full searchable snapshots store primary data locally and store replica data in the snapshot.
   * Partial searchable snapshots store no data locally.
   */
  storage?: SearchableSnapshotStorage;
}

export interface RolloverAction {
  max_age?: string;
  max_docs?: number;
  max_primary_shard_size?: string;
  /**
   * @deprecated This will be removed in versions 8+ of the stack
   */
  max_size?: string;
}

export interface SerializedHotPhase extends SerializedPhase {
  actions: {
    rollover?: RolloverAction;
    forcemerge?: ForcemergeAction;
    readonly?: {};
    shrink?: ShrinkAction;

    set_priority?: {
      priority: number | null;
    };
    /**
     * Only available on enterprise license
     */
    searchable_snapshot?: SearchableSnapshotAction;
  };
}

export interface SerializedWarmPhase extends SerializedPhase {
  actions: {
    allocate?: AllocateAction;
    shrink?: ShrinkAction;
    forcemerge?: ForcemergeAction;
    readonly?: {};
    set_priority?: {
      priority: number | null;
    };
    migrate?: MigrateAction;
  };
}

export interface SerializedColdPhase extends SerializedPhase {
  actions: {
    freeze?: {};
    readonly?: {};
    allocate?: AllocateAction;
    set_priority?: {
      priority: number | null;
    };
    migrate?: MigrateAction;
    /**
     * Only available on enterprise license
     */
    searchable_snapshot?: SearchableSnapshotAction;
  };
}

export interface SerializedFrozenPhase extends SerializedPhase {
  actions: {
    allocate?: AllocateAction;
    set_priority?: {
      priority: number | null;
    };
    migrate?: MigrateAction;
    /**
     * Only available on enterprise license
     */
    searchable_snapshot?: SearchableSnapshotAction;
  };
}

export interface SerializedDeletePhase extends SerializedPhase {
  actions: {
    wait_for_snapshot?: {
      policy: string;
    };
    delete?: {
      delete_searchable_snapshot?: boolean;
    };
  };
}

export interface AllocateAction {
  number_of_replicas?: number;
  include?: {};
  exclude?: {};
  require?: {
    [attribute: string]: string;
  };
}

export interface ShrinkAction {
  number_of_shards?: number;
  max_primary_shard_size?: string;
}

export interface ForcemergeAction {
  max_num_segments: number;
  // only accepted value for index_codec
  index_codec?: 'best_compression';
}

export interface LegacyPolicy {
  name: string;
  phases: {
    delete: DeletePhase;
  };
}

export interface CommonPhaseSettings {
  phaseEnabled: boolean;
}

export interface PhaseWithMinAge {
  selectedMinimumAge: string;
  selectedMinimumAgeUnits: string;
}

export interface PhaseWithIndexPriority {
  phaseIndexPriority: string;
}

export interface PhaseWithForcemergeAction {
  forceMergeEnabled: boolean;
  selectedForceMergeSegments: string;
  bestCompressionEnabled: boolean;
}

export interface DeletePhase extends CommonPhaseSettings, PhaseWithMinAge {
  waitForSnapshotPolicy: string;
}

export interface IndexLifecyclePolicy {
  index: string;
  managed: boolean;
  action?: string;
  action_time_millis?: number;
  age?: string;
  failed_step?: string;
  failed_step_retry_count?: number;
  is_auto_retryable_error?: boolean;
  lifecycle_date_millis?: number;
  phase?: string;
  phase_execution?: {
    policy: string;
    modified_date_in_millis: number;
    version: number;
    phase_definition: SerializedPhase;
  };
  phase_time_millis?: number;
  policy?: string;
  step?: string;
  step_info?: {
    reason?: string;
    type?: string;
    message?: string;
  };
  step_time_millis?: number;
}

export interface Index extends IndexInterface {
  ilm: IndexLifecyclePolicy;
}
