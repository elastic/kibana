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
} from '../../../common/types';

export const defaultNewHotPhase: HotPhase = {
  phaseEnabled: true,
  rolloverEnabled: true,
  selectedMaxAge: '30',
  selectedMaxAgeUnits: 'd',
  selectedMaxSizeStored: '50',
  selectedMaxSizeStoredUnits: 'gb',
  forceMergeEnabled: false,
  selectedForceMergeSegments: '',
  bestCompressionEnabled: false,
  phaseIndexPriority: '100',
  selectedMaxDocuments: '',
};

export const defaultNewWarmPhase: WarmPhase = {
  phaseEnabled: false,
  forceMergeEnabled: false,
  selectedForceMergeSegments: '',
  bestCompressionEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  selectedNodeAttrs: '',
  shrinkEnabled: false,
  selectedPrimaryShardCount: '',
  selectedReplicaCount: '',
  warmPhaseOnRollover: true,
  phaseIndexPriority: '50',
  dataTierAllocationType: 'default',
};

export const defaultNewColdPhase: ColdPhase = {
  phaseEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  selectedNodeAttrs: '',
  selectedReplicaCount: '',
  freezeEnabled: false,
  phaseIndexPriority: '0',
  dataTierAllocationType: 'default',
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
