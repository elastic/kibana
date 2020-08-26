/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SerializedPhase,
  ColdPhase,
  DeletePhase,
  HotPhase,
  WarmPhase,
  FrozenPhase,
} from '../services/policies/types';

export const defaultNewHotPhase: HotPhase = {
  phaseEnabled: true,
  rolloverEnabled: true,
  selectedMaxAge: '30',
  selectedMaxAgeUnits: 'd',
  selectedMaxSizeStored: '50',
  selectedMaxSizeStoredUnits: 'gb',
  phaseIndexPriority: '100',
  selectedMaxDocuments: '',
};

export const defaultNewWarmPhase: WarmPhase = {
  phaseEnabled: false,
  forceMergeEnabled: false,
  selectedForceMergeSegments: '',
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  selectedNodeAttrs: '',
  shrinkEnabled: false,
  selectedPrimaryShardCount: '',
  selectedReplicaCount: '',
  warmPhaseOnRollover: true,
  phaseIndexPriority: '50',
};

export const defaultNewColdPhase: ColdPhase = {
  phaseEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  selectedNodeAttrs: '',
  selectedReplicaCount: '',
  freezeEnabled: false,
  phaseIndexPriority: '0',
};

export const defaultNewFrozenPhase: FrozenPhase = {
  phaseEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  selectedNodeAttrs: '',
  selectedReplicaCount: '',
  freezeEnabled: false,
  phaseIndexPriority: '0',
};

export const defaultNewDeletePhase: DeletePhase = {
  phaseEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  waitForSnapshotPolicy: '',
};

export const serializedPhaseInitialization: SerializedPhase = {
  min_age: '0ms',
  actions: {},
};
