/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './ui_metric';

export const SET_PHASE_DATA: string = 'SET_PHASE_DATA';
export const SET_SELECTED_NODE_ATTRS: string = 'SET_SELECTED_NODE_ATTRS';
export const PHASE_HOT: string = 'hot';
export const PHASE_WARM: string = 'warm';
export const PHASE_COLD: string = 'cold';
export const PHASE_DELETE: string = 'delete';

export const PHASE_ENABLED: string = 'phaseEnabled';

export const PHASE_ROLLOVER_ENABLED: string = 'rolloverEnabled';
export const WARM_PHASE_ON_ROLLOVER: string = 'warmPhaseOnRollover';
export const PHASE_ROLLOVER_ALIAS: string = 'selectedAlias';
export const PHASE_ROLLOVER_MAX_AGE: string = 'selectedMaxAge';
export const PHASE_ROLLOVER_MAX_AGE_UNITS: string = 'selectedMaxAgeUnits';
export const PHASE_ROLLOVER_MAX_SIZE_STORED: string = 'selectedMaxSizeStored';
export const PHASE_ROLLOVER_MAX_DOCUMENTS: string = 'selectedMaxDocuments';
export const PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS: string = 'selectedMaxSizeStoredUnits';
export const PHASE_ROLLOVER_MINIMUM_AGE: string = 'selectedMinimumAge';
export const PHASE_ROLLOVER_MINIMUM_AGE_UNITS: string = 'selectedMinimumAgeUnits';

export const PHASE_FORCE_MERGE_SEGMENTS: string = 'selectedForceMergeSegments';
export const PHASE_FORCE_MERGE_ENABLED: string = 'forceMergeEnabled';
export const PHASE_FREEZE_ENABLED: string = 'freezeEnabled';

export const PHASE_SHRINK_ENABLED: string = 'shrinkEnabled';

export const PHASE_NODE_ATTRS: string = 'selectedNodeAttrs';
export const PHASE_PRIMARY_SHARD_COUNT: string = 'selectedPrimaryShardCount';
export const PHASE_REPLICA_COUNT: string = 'selectedReplicaCount';
export const PHASE_INDEX_PRIORITY: string = 'phaseIndexPriority';

export const PHASE_WAIT_FOR_SNAPSHOT_POLICY = 'waitForSnapshotPolicy';

export const PHASE_ATTRIBUTES_THAT_ARE_NUMBERS_VALIDATE: string[] = [
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_REPLICA_COUNT,
  PHASE_INDEX_PRIORITY,
];
export const PHASE_ATTRIBUTES_THAT_ARE_NUMBERS: string[] = [
  ...PHASE_ATTRIBUTES_THAT_ARE_NUMBERS_VALIDATE,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  PHASE_ROLLOVER_MAX_DOCUMENTS,
];

export const STRUCTURE_INDEX_TEMPLATE: string = 'indexTemplate';
export const STRUCTURE_TEMPLATE_SELECTION: string = 'templateSelection';
export const STRUCTURE_TEMPLATE_NAME: string = 'templateName';
export const STRUCTURE_CONFIGURATION: string = 'configuration';
export const STRUCTURE_NODE_ATTRS: string = 'node_attrs';
export const STRUCTURE_PRIMARY_NODES: string = 'primary_nodes';
export const STRUCTURE_REPLICAS: string = 'replicas';

export const STRUCTURE_POLICY_CONFIGURATION: string = 'policyConfiguration';

export const STRUCTURE_REVIEW: string = 'review';
export const STRUCTURE_POLICY_NAME: string = 'policyName';
export const STRUCTURE_INDEX_NAME: string = 'indexName';
export const STRUCTURE_ALIAS_NAME: string = 'aliasName';

export const ERROR_STRUCTURE: any = {
  [PHASE_HOT]: {
    [PHASE_ROLLOVER_ALIAS]: [],
    [PHASE_ROLLOVER_MAX_AGE]: [],
    [PHASE_ROLLOVER_MAX_AGE_UNITS]: [],
    [PHASE_ROLLOVER_MAX_SIZE_STORED]: [],
    [PHASE_ROLLOVER_MAX_DOCUMENTS]: [],
    [PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]: [],
    [PHASE_INDEX_PRIORITY]: [],
  },
  [PHASE_WARM]: {
    [PHASE_ROLLOVER_ALIAS]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: [],
    [PHASE_NODE_ATTRS]: [],
    [PHASE_PRIMARY_SHARD_COUNT]: [],
    [PHASE_REPLICA_COUNT]: [],
    [PHASE_FORCE_MERGE_SEGMENTS]: [],
    [PHASE_INDEX_PRIORITY]: [],
  },
  [PHASE_COLD]: {
    [PHASE_ROLLOVER_ALIAS]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: [],
    [PHASE_NODE_ATTRS]: [],
    [PHASE_REPLICA_COUNT]: [],
    [PHASE_INDEX_PRIORITY]: [],
  },
  [PHASE_DELETE]: {
    [PHASE_ROLLOVER_ALIAS]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: [],
  },
  [STRUCTURE_POLICY_NAME]: [],
};
