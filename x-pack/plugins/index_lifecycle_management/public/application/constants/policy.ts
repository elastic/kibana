/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SerializedPhase,
  ColdPhase,
  DeletePhase,
  WarmPhase,
  SerializedPolicy,
} from '../../../common/types';

export const defaultSetPriority: string = '100';

export const defaultPolicy: SerializedPolicy = {
  name: '',
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '30d',
          max_size: '50gb',
        },
      },
    },
  },
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
