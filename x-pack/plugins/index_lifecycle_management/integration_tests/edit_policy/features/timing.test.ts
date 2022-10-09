/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setupTimingTestBed, TimingTestBed } from './timing.helpers';
import { PhaseWithTiming } from '../../../common/types';

describe('<EditPolicy /> timing', () => {
  let testBed: TimingTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupTimingTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
  });

  ['warm', 'cold', 'frozen', 'delete'].forEach((phase: string) => {
    test(`timing is only shown when ${phase} phase is enabled`, async () => {
      const { actions } = testBed;
      const phaseWithTiming = phase as PhaseWithTiming;
      expect(actions[phaseWithTiming].hasMinAgeInput()).toBeFalsy();
      await actions.togglePhase(phaseWithTiming);
      expect(actions[phaseWithTiming].hasMinAgeInput()).toBeTruthy();
    });
  });
});
