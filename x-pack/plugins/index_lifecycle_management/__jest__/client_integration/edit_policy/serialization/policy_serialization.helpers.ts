/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'src/core/public';
import { AppServicesContext } from '../../../../public/types';
import {
  createColdPhaseActions,
  createDeletePhaseActions,
  createFormSetValueAction,
  createFrozenPhaseActions,
  createHotPhaseActions,
  createRolloverActions,
  createSavePolicyAction,
  createTogglePhaseAction,
  createWarmPhaseActions,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';

type SetupReturn = ReturnType<typeof setupSerializationTestBed>;

export type SerializationTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupSerializationTestBed = async (
  httpSetup: HttpSetup,
  arg?: {
    appServicesContext?: Partial<AppServicesContext>;
  }
) => {
  const testBed = await initTestBed(httpSetup, arg);

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      savePolicy: createSavePolicyAction(testBed),
      setPolicyName: createFormSetValueAction(testBed, 'policyNameField'),
      ...createRolloverActions(testBed),
      ...createHotPhaseActions(testBed),
      ...createWarmPhaseActions(testBed),
      ...createColdPhaseActions(testBed),
      ...createFrozenPhaseActions(testBed),
      ...createDeletePhaseActions(testBed),
    },
  };
};
