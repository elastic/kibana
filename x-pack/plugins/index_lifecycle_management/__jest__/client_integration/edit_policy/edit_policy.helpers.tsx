/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBedConfig } from '@kbn/test/jest';
import { AppServicesContext } from '../../../public/types';

import { Phase } from '../../../common/types';

import {
  createNodeAllocationActions,
  createFormToggleAction,
  createFormSetValueAction,
  setReplicas,
  createSearchableSnapshotActions,
  createTogglePhaseAction,
  createSavePolicyAction,
  createErrorsActions,
  createRolloverActions,
  createSetWaitForSnapshotAction,
  createMinAgeActions,
  createShrinkActions,
  createFreezeActions,
  createForceMergeActions,
  createReadonlyActions,
  createIndexPriorityActions,
} from '../helpers';
import { initTestBed } from './init_test_bed';

type SetupReturn = ReturnType<typeof setup>;
export type EditPolicyTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setup = async (arg?: {
  appServicesContext?: Partial<AppServicesContext>;
  testBedConfig?: Partial<TestBedConfig>;
}) => {
  const testBed = await initTestBed(arg);

  const { exists } = testBed;

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      savePolicy: createSavePolicyAction(testBed),
      toggleSaveAsNewPolicy: createFormToggleAction(testBed, 'saveAsNewSwitch'),
      setPolicyName: createFormSetValueAction(testBed, 'policyNameField'),
      errors: {
        ...createErrorsActions(testBed),
      },
      timeline: {
        hasPhase: (phase: Phase) => exists(`ilmTimelinePhase-${phase}`),
      },
      rollover: {
        ...createRolloverActions(testBed),
      },
      hot: {
        ...createForceMergeActions(testBed, 'hot'),
        ...createIndexPriorityActions(testBed, 'hot'),
        ...createShrinkActions(testBed, 'hot'),
        ...createReadonlyActions(testBed, 'hot'),
        ...createSearchableSnapshotActions(testBed, 'hot'),
      },
      warm: {
        ...createMinAgeActions(testBed, 'warm'),
        setReplicas: (value: string) => setReplicas(testBed, 'warm', value),
        ...createShrinkActions(testBed, 'warm'),
        ...createForceMergeActions(testBed, 'warm'),
        ...createReadonlyActions(testBed, 'warm'),
        ...createIndexPriorityActions(testBed, 'warm'),
        ...createNodeAllocationActions(testBed, 'warm'),
      },
      cold: {
        ...createMinAgeActions(testBed, 'cold'),
        setReplicas: (value: string) => setReplicas(testBed, 'cold', value),
        ...createFreezeActions(testBed, 'cold'),
        ...createReadonlyActions(testBed, 'cold'),
        ...createIndexPriorityActions(testBed, 'cold'),
        ...createSearchableSnapshotActions(testBed, 'cold'),
        ...createNodeAllocationActions(testBed, 'cold'),
      },
      frozen: {
        ...createMinAgeActions(testBed, 'frozen'),
        ...createSearchableSnapshotActions(testBed, 'frozen'),
      },
      delete: {
        isShown: () => exists('delete-phase'),
        ...createMinAgeActions(testBed, 'delete'),
        setWaitForSnapshotPolicy: createSetWaitForSnapshotAction(testBed),
      },
    },
  };
};
