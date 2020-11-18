/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export interface SerializedHotPhase extends SerializedPhase {
  actions: {
    rollover?: {
      max_size?: string;
      max_age?: string;
      max_docs?: number;
    };
    forcemerge?: ForcemergeAction;
    set_priority?: {
      priority: number | null;
    };
    /**
     * Only available on enterprise license
     */
    searchable_snapshot?: {
      snapshot_repository: string;
    };
  };
}

export interface SerializedWarmPhase extends SerializedPhase {
  actions: {
    allocate?: AllocateAction;
    shrink?: {
      number_of_shards: number;
    };
    forcemerge?: ForcemergeAction;
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
    /**
     * Only available on enterprise license
     */
    searchable_snapshot?: {
      snapshot_repository: string;
    };
  };
}

export interface SerializedDeletePhase extends SerializedPhase {
  actions: {
    wait_for_snapshot?: {
      policy: string;
    };
    delete?: {
      delete_searchable_snapshot: boolean;
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

/**
 * Different types of allocation markers we use in deserialized policies.
 *
 * default - use data tier based data allocation based on node roles -- this is ES best practice mode.
 * custom - use node_attrs to allocate data to specific nodes
 * none - do not move data anywhere when entering a phase
 */
export type DataTierAllocationType = 'default' | 'custom' | 'none';

export interface PhaseWithAllocationAction {
  selectedNodeAttrs: string;
  selectedReplicaCount: string;
  /**
   * A string value indicating allocation type. If unspecified we assume the user
   * wants to use default allocation.
   */
  dataTierAllocationType: DataTierAllocationType;
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
