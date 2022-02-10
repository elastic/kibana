/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBedConfig } from '@kbn/test-jest-helpers';

import { AppServicesContext } from '../../../../../public/types';
import { createTogglePhaseAction, createNodeAllocationActions } from '../../../helpers';
import { initTestBed } from '../../init_test_bed';

type SetupReturn = ReturnType<typeof setupCloudNodeAllocation>;

export type CloudNodeAllocationTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupCloudNodeAllocation = async (arg?: {
  appServicesContext?: Partial<AppServicesContext>;
  testBedConfig?: Partial<TestBedConfig>;
}) => {
  const testBed = await initTestBed(arg);

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      warm: {
        ...createNodeAllocationActions(testBed, 'warm'),
      },
      cold: {
        ...createNodeAllocationActions(testBed, 'cold'),
      },
    },
  };
};
