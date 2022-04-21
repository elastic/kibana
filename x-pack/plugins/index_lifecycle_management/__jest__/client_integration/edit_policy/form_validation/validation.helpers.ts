/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBedConfig } from '@kbn/test-jest-helpers';
import {
  createColdPhaseActions,
  createDeletePhaseActions,
  createErrorsActions,
  createFormSetValueAction,
  createFormToggleAction,
  createFrozenPhaseActions,
  createHotPhaseActions,
  createRolloverActions,
  createSavePolicyAction,
  createTogglePhaseAction,
  createWarmPhaseActions,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';

type SetupReturn = ReturnType<typeof setupValidationTestBed>;

export type ValidationTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupValidationTestBed = async (arg?: { testBedConfig?: Partial<TestBedConfig> }) => {
  const testBed = await initTestBed(arg);

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      setPolicyName: createFormSetValueAction(testBed, 'policyNameField'),
      savePolicy: createSavePolicyAction(testBed),
      toggleSaveAsNewPolicy: createFormToggleAction(testBed, 'saveAsNewSwitch'),
      ...createRolloverActions(testBed),
      ...createErrorsActions(testBed),
      ...createHotPhaseActions(testBed),
      ...createWarmPhaseActions(testBed),
      ...createColdPhaseActions(testBed),
      ...createFrozenPhaseActions(testBed),
      ...createDeletePhaseActions(testBed),
    },
  };
};
