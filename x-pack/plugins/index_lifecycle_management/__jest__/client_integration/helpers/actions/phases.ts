/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import {
  createForceMergeActions,
  createShrinkActions,
  createReadonlyActions,
  createIndexPriorityActions,
  createSearchableSnapshotActions,
  createMinAgeActions,
  createNodeAllocationActions,
  createReplicasAction,
  createSnapshotPolicyActions,
} from '.';

export const createHotPhaseActions = (testBed: TestBed) => {
  return {
    hot: {
      ...createForceMergeActions(testBed, 'hot'),
      ...createShrinkActions(testBed, 'hot'),
      ...createReadonlyActions(testBed, 'hot'),
      ...createIndexPriorityActions(testBed, 'hot'),
      ...createSearchableSnapshotActions(testBed, 'hot'),
    },
  };
};
export const createWarmPhaseActions = (testBed: TestBed) => {
  return {
    warm: {
      ...createMinAgeActions(testBed, 'warm'),
      ...createForceMergeActions(testBed, 'warm'),
      ...createShrinkActions(testBed, 'warm'),
      ...createReadonlyActions(testBed, 'warm'),
      ...createIndexPriorityActions(testBed, 'warm'),
      ...createNodeAllocationActions(testBed, 'warm'),
      ...createReplicasAction(testBed, 'warm'),
    },
  };
};
export const createColdPhaseActions = (testBed: TestBed) => {
  return {
    cold: {
      ...createMinAgeActions(testBed, 'cold'),
      ...createReplicasAction(testBed, 'cold'),
      ...createReadonlyActions(testBed, 'cold'),
      ...createIndexPriorityActions(testBed, 'cold'),
      ...createNodeAllocationActions(testBed, 'cold'),
      ...createSearchableSnapshotActions(testBed, 'cold'),
    },
  };
};

export const createFrozenPhaseActions = (testBed: TestBed) => {
  return {
    frozen: {
      ...createMinAgeActions(testBed, 'frozen'),
      ...createSearchableSnapshotActions(testBed, 'frozen'),
    },
  };
};

export const createDeletePhaseActions = (testBed: TestBed) => {
  return {
    delete: {
      ...createMinAgeActions(testBed, 'delete'),
      ...createSnapshotPolicyActions(testBed),
    },
  };
};
