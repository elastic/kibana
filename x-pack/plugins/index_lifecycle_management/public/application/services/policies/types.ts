/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SerializedPolicy {
  name: string;
  phases: Phases;
}

export interface Phases {
  hot?: SerializedHotPhase;
  warm?: SerializedWarmPhase;
  cold?: SerializedColdPhase;
  frozen?: SerializedFrozenPhase;
  delete?: SerializedDeletePhase;
}

export interface PolicyFromES {
  modified_date: string;
  name: string;
  policy: SerializedPolicy;
  version: number;
}

export interface SerializedPhase {
  min_age: string;
  actions: {
    [action: string]: any;
  };
}

export interface SerializedHotPhase extends SerializedPhase {
  actions: {
    rollover?: {
      max_size?: string;
      max_age?: string;
      max_docs?: number;
    };
    set_priority?: {
      priority: number | null;
    };
  };
}

export interface SerializedWarmPhase extends SerializedPhase {
  actions: {
    allocate?: AllocateAction;
    shrink?: {
      number_of_shards: number;
    };
    forcemerge?: {
      max_num_segments: number;
    };
    set_priority?: {
      priority: number | null;
    };
  };
}

export interface SerializedColdPhase extends SerializedPhase {
  actions: {
    freeze?: {};
    allocate?: AllocateAction;
    set_priority?: {
      priority: number | null;
    };
  };
}

export interface SerializedFrozenPhase extends SerializedPhase {
  actions: {
    freeze?: {};
    allocate?: AllocateAction;
    set_priority?: {
      priority: number | null;
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
  number_of_replicas: number;
  include: {};
  exclude: {};
  require: {
    [attribute: string]: string;
  };
}

export interface Policy {
  name: string;
  phases: {
    hot: HotPhase;
    warm: WarmPhase;
    cold: ColdPhase;
    frozen: FrozenPhase;
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

export interface PhaseWithAllocationAction {
  selectedNodeAttrs: string;
  selectedReplicaCount: string;
}

export interface PhaseWithIndexPriority {
  phaseIndexPriority: string;
}

export interface HotPhase extends CommonPhaseSettings, PhaseWithIndexPriority {
  rolloverEnabled: boolean;
  selectedMaxSizeStored: string;
  selectedMaxSizeStoredUnits: string;
  selectedMaxDocuments: string;
  selectedMaxAge: string;
  selectedMaxAgeUnits: string;
}

export interface WarmPhase
  extends CommonPhaseSettings,
    PhaseWithMinAge,
    PhaseWithAllocationAction,
    PhaseWithIndexPriority {
  warmPhaseOnRollover: boolean;
  shrinkEnabled: boolean;
  selectedPrimaryShardCount: string;
  forceMergeEnabled: boolean;
  selectedForceMergeSegments: string;
}

export interface ColdPhase
  extends CommonPhaseSettings,
    PhaseWithMinAge,
    PhaseWithAllocationAction,
    PhaseWithIndexPriority {
  freezeEnabled: boolean;
}

export interface FrozenPhase
  extends CommonPhaseSettings,
    PhaseWithMinAge,
    PhaseWithAllocationAction,
    PhaseWithIndexPriority {
  freezeEnabled: boolean;
}

export interface DeletePhase extends CommonPhaseSettings, PhaseWithMinAge {
  waitForSnapshotPolicy: string;
}
