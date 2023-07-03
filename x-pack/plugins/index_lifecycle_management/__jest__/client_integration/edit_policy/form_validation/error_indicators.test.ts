/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setupValidationTestBed, ValidationTestBed } from './validation.helpers';

describe('<EditPolicy /> error indicators', () => {
  let testBed: ValidationTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupValidationTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
  });
  test('shows phase error indicators correctly', async () => {
    // This test simulates a user configuring a policy phase by phase. The flow is the following:
    // 0. Start with policy with no validation issues present
    // 1. Configure hot, introducing a validation error
    // 2. Configure warm, introducing a validation error
    // 3. Configure cold, introducing a validation error
    // 4. Fix validation error in hot
    // 5. Fix validation error in warm
    // 6. Fix validation error in cold
    // We assert against each of these progressive states.

    const { actions } = testBed;

    // 0. No validation issues
    expect(actions.errors.havePhaseCallout('hot')).toBe(false);
    expect(actions.errors.havePhaseCallout('warm')).toBe(false);
    expect(actions.errors.havePhaseCallout('cold')).toBe(false);

    // 1. Hot phase validation issue
    await actions.hot.toggleForceMerge();
    await actions.hot.setForcemergeSegmentsCount('-22');
    actions.errors.waitForValidation();
    expect(actions.errors.havePhaseCallout('hot')).toBe(true);
    expect(actions.errors.havePhaseCallout('warm')).toBe(false);
    expect(actions.errors.havePhaseCallout('cold')).toBe(false);

    // 2. Warm phase validation issue
    await actions.togglePhase('warm');
    await actions.warm.toggleForceMerge();
    await actions.warm.setForcemergeSegmentsCount('-22');
    actions.errors.waitForValidation();
    expect(actions.errors.havePhaseCallout('hot')).toBe(true);
    expect(actions.errors.havePhaseCallout('warm')).toBe(true);
    expect(actions.errors.havePhaseCallout('cold')).toBe(false);

    // 3. Cold phase validation issue
    await actions.togglePhase('cold');
    await actions.cold.setReplicas('-33');
    actions.errors.waitForValidation();
    expect(actions.errors.havePhaseCallout('hot')).toBe(true);
    expect(actions.errors.havePhaseCallout('warm')).toBe(true);
    expect(actions.errors.havePhaseCallout('cold')).toBe(true);

    // 4. Fix validation issue in hot
    await actions.hot.setForcemergeSegmentsCount('1');
    actions.errors.waitForValidation();
    expect(actions.errors.havePhaseCallout('hot')).toBe(false);
    expect(actions.errors.havePhaseCallout('warm')).toBe(true);
    expect(actions.errors.havePhaseCallout('cold')).toBe(true);

    // 5. Fix validation issue in warm
    await actions.warm.setForcemergeSegmentsCount('1');
    actions.errors.waitForValidation();
    expect(actions.errors.havePhaseCallout('hot')).toBe(false);
    expect(actions.errors.havePhaseCallout('warm')).toBe(false);
    expect(actions.errors.havePhaseCallout('cold')).toBe(true);

    // 6. Fix validation issue in cold
    await actions.cold.setReplicas('1');
    actions.errors.waitForValidation();
    expect(actions.errors.havePhaseCallout('hot')).toBe(false);
    expect(actions.errors.havePhaseCallout('warm')).toBe(false);
    expect(actions.errors.havePhaseCallout('cold')).toBe(false);
  });

  test('global error callout should show, after clicking the "Save" button, if there are any form errors', async () => {
    const { actions } = testBed;

    expect(actions.errors.haveGlobalCallout()).toBe(false);
    expect(actions.errors.havePhaseCallout('hot')).toBe(false);
    expect(actions.errors.havePhaseCallout('warm')).toBe(false);
    expect(actions.errors.havePhaseCallout('cold')).toBe(false);

    await actions.toggleSaveAsNewPolicy();
    await actions.setPolicyName('');
    actions.errors.waitForValidation();
    await actions.savePolicy();

    expect(actions.errors.haveGlobalCallout()).toBe(true);
    expect(actions.errors.havePhaseCallout('hot')).toBe(false);
    expect(actions.errors.havePhaseCallout('warm')).toBe(false);
    expect(actions.errors.havePhaseCallout('cold')).toBe(false);
  });

  test('clears all error indicators if last erring field is unmounted', async () => {
    const { actions } = testBed;

    await actions.togglePhase('cold');
    await actions.cold.setMinAgeValue('7');
    // introduce validation error
    await actions.cold.setSearchableSnapshot('');

    await actions.savePolicy();
    actions.errors.waitForValidation();

    expect(actions.errors.haveGlobalCallout()).toBe(true);
    expect(actions.errors.havePhaseCallout('hot')).toBe(false);
    expect(actions.errors.havePhaseCallout('warm')).toBe(false);
    expect(actions.errors.havePhaseCallout('cold')).toBe(true);

    // unmount the field
    await actions.cold.toggleSearchableSnapshot();

    expect(actions.errors.haveGlobalCallout()).toBe(false);
    expect(actions.errors.havePhaseCallout('hot')).toBe(false);
    expect(actions.errors.havePhaseCallout('warm')).toBe(false);
    expect(actions.errors.havePhaseCallout('cold')).toBe(false);
  });
});
