/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  createMinAgeActions,
  createSavePolicyAction,
  createSnapshotPolicyActions,
  createTogglePhaseAction,
} from '../../helpers';
import { initTestBed } from '../init_test_bed';

type SetupReturn = ReturnType<typeof setupDeleteTestBed>;

export type DeleteTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupDeleteTestBed = async (httpSetup: HttpSetup) => {
  const testBed = await initTestBed(httpSetup);
  const { exists } = testBed;

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      savePolicy: createSavePolicyAction(testBed),
      delete: {
        isShown: () => exists('delete-phase'),
        ...createMinAgeActions(testBed, 'delete'),
        ...createSnapshotPolicyActions(testBed),
      },
    },
  };
};
