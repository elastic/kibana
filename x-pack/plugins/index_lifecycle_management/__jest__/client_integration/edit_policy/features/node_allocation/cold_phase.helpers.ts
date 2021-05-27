/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEnablePhaseAction, createNodeAllocationActions } from '../../../helpers';
import { initTestBed } from '../../init_test_bed';

type SetupReturn = ReturnType<typeof setupColdPhaseNodeAllocation>;

export type NodeAllocationTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupColdPhaseNodeAllocation = async () => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: {
      enable: createEnablePhaseAction(testBed, 'cold'),
      ...createNodeAllocationActions(testBed, 'cold'),
    },
  };
};
