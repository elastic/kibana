/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createForceMergeActions,
  createMinAgeActions,
  createReadonlyActions,
  createRolloverActions,
  createSearchableSnapshotActions,
  createShrinkActions,
  createTogglePhaseAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';

type SetupReturn = ReturnType<typeof setupRolloverTestBed>;

export type RolloverTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupRolloverTestBed = async () => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      ...createRolloverActions(testBed),
      hot: {
        ...createForceMergeActions(testBed, 'hot'),
        ...createShrinkActions(testBed, 'hot'),
        ...createReadonlyActions(testBed, 'hot'),
        ...createSearchableSnapshotActions(testBed, 'hot'),
      },
      warm: {
        ...createMinAgeActions(testBed, 'warm'),
      },
      cold: {
        ...createMinAgeActions(testBed, 'cold'),
      },
      frozen: {
        ...createMinAgeActions(testBed, 'frozen'),
      },
      delete: {
        ...createMinAgeActions(testBed, 'delete'),
      },
    },
  };
};
