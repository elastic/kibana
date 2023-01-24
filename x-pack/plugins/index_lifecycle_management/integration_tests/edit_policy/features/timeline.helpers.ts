/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { createTogglePhaseAction } from '../../helpers';
import { initTestBed } from '../init_test_bed';
import { Phase } from '../../../common/types';

type SetupReturn = ReturnType<typeof setupTimelineTestBed>;

export type TimelineTestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

export const setupTimelineTestBed = async (httpSetup: HttpSetup) => {
  const testBed = await initTestBed(httpSetup);
  const { exists } = testBed;

  return {
    ...testBed,
    actions: {
      togglePhase: createTogglePhaseAction(testBed),
      timeline: {
        hasPhase: (phase: Phase) => exists(`ilmTimelinePhase-${phase}`),
      },
    },
  };
};
