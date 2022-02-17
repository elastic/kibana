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
  createSavePolicyAction,
  createSearchableSnapshotActions,
  createShrinkActions,
  createTogglePhaseAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';
import { AppServicesContext } from '../../../../public/types';

type SetupReturn = ReturnType<typeof setupSearchableSnapshotsTestBed>;

export type SearchableSnapshotsTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupSearchableSnapshotsTestBed = async (args?: {
  appServicesContext?: Partial<AppServicesContext>;
}) => {
  const testBed = await initTestBed(args);

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      savePolicy: createSavePolicyAction(testBed),
      ...createRolloverActions(testBed),
      hot: {
        ...createSearchableSnapshotActions(testBed, 'hot'),
        ...createForceMergeActions(testBed, 'hot'),
        ...createShrinkActions(testBed, 'hot'),
      },
      warm: {
        ...createForceMergeActions(testBed, 'warm'),
        ...createShrinkActions(testBed, 'warm'),
        ...createReadonlyActions(testBed, 'warm'),
      },
      cold: {
        ...createMinAgeActions(testBed, 'cold'),
        ...createSearchableSnapshotActions(testBed, 'cold'),
        ...createReadonlyActions(testBed, 'cold'),
      },
      frozen: {
        ...createMinAgeActions(testBed, 'frozen'),
        ...createSearchableSnapshotActions(testBed, 'frozen'),
      },
    },
  };
};
