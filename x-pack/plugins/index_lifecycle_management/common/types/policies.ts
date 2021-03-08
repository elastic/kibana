/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Index as IndexInterface } from '../../../index_management/common/types';

export type PhaseWithAllocation = 'warm' | 'cold';

export interface SerializedPolicy {
  name: string;
  phases: Phases;
}

export interface Phases {
  hot?: SerializedHotPhase;
  warm?: SerializedWarmPhase;
  cold?: SerializedColdPhase;
  delete?: SerializedDeletePhase;
}

export type PhasesExceptDelete = keyof Omit<Phases, 'delete'>;

export interface PolicyFromES {
  modified_date: string;
  name: string;
  policy: SerializedPolicy;
  version: number;
  linkedIndices?: string[];
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

export interface SearchableSnapshotAction {
  snapshot_repository: string;
  /**
   * We do not configure this value in the UI as it is an advanced setting that will
   * not suit the vast majority of cases.
   */
  force_merge_index?: boolean;
}

export interface RolloverAction {
  max_size?: string;
  max_age?: string;
  max_docs?: number;
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
    rollup?: RollupAction;
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
    allocate?: AllocateAction;
    set_priority?: {
      priority: number | null;
    };
    migrate?: MigrateAction;
    rollup?: RollupAction;
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
  number_of_shards: number;
}

export interface ForcemergeAction {
  max_num_segments: number;
  // only accepted value for index_codec
  index_codec?: 'best_compression';
}

export interface RollupAction {
  config: {
    groups: {
      date_histogram: {
        field: string;
        /**
         * Deprecated interval specification option. Mutually exclusive with "calendar_interval" and "fixed_interval".
         */
        interval?: string;
        /**
         * Mutually exclusive with "interval" and "fixed_interval".
         */
        calendar_interval?: string;
        /**
         * Mutually exclusive with "interval" and "calendar_interval".
         */
        fixed_interval?: string;
        delay?: string;
        time_zone?: string;
      };
      terms?: {
        fields: string[];
      };
      histogram?: {
        interval?: string;
        fields: string[];
      };
    };
    metrics?: Array<{ field: string; metrics: string[] }>;
  };
  /**
   * Policy to manage the new, rollup index created by this action.
   *
   * Default behavior is to use the policy that created the index to manage the index too.
   */
  rollup_policy?: string;
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
    stack_trace?: string;
    type?: string;
    message?: string;
  };
  step_time_millis?: number;
}

export interface Index extends IndexInterface {
  ilm: IndexLifecyclePolicy;
}
