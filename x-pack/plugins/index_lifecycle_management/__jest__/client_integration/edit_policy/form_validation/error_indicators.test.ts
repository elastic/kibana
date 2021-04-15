/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers/setup_environment';
import { getDefaultHotPhasePolicy } from '../constants';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';

describe('<EditPolicy /> error indicators', () => {
  let testBed: EditPolicyTestBed;
  let runTimers: () => void;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: {},
      nodesByAttributes: { test: ['123'] },
      isUsingDeprecatedDataRoleConfig: false,
    });
    httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();

    ({ runTimers } = testBed);
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
    expect(actions.hot.hasErrorIndicator()).toBe(false);
    expect(actions.warm.hasErrorIndicator()).toBe(false);
    expect(actions.cold.hasErrorIndicator()).toBe(false);

    // 1. Hot phase validation issue
    await actions.hot.toggleForceMerge(true);
    await actions.hot.setForcemergeSegmentsCount('-22');
    runTimers();
    expect(actions.hot.hasErrorIndicator()).toBe(true);
    expect(actions.warm.hasErrorIndicator()).toBe(false);
    expect(actions.cold.hasErrorIndicator()).toBe(false);

    // 2. Warm phase validation issue
    await actions.warm.enable(true);
    await actions.warm.toggleForceMerge(true);
    await actions.warm.setForcemergeSegmentsCount('-22');
    runTimers();
    expect(actions.hot.hasErrorIndicator()).toBe(true);
    expect(actions.warm.hasErrorIndicator()).toBe(true);
    expect(actions.cold.hasErrorIndicator()).toBe(false);

    // 3. Cold phase validation issue
    await actions.cold.enable(true);
    await actions.cold.setReplicas('-33');
    runTimers();
    expect(actions.hot.hasErrorIndicator()).toBe(true);
    expect(actions.warm.hasErrorIndicator()).toBe(true);
    expect(actions.cold.hasErrorIndicator()).toBe(true);

    // 4. Fix validation issue in hot
    await actions.hot.setForcemergeSegmentsCount('1');
    runTimers();
    expect(actions.hot.hasErrorIndicator()).toBe(false);
    expect(actions.warm.hasErrorIndicator()).toBe(true);
    expect(actions.cold.hasErrorIndicator()).toBe(true);

    // 5. Fix validation issue in warm
    await actions.warm.setForcemergeSegmentsCount('1');
    runTimers();
    expect(actions.hot.hasErrorIndicator()).toBe(false);
    expect(actions.warm.hasErrorIndicator()).toBe(false);
    expect(actions.cold.hasErrorIndicator()).toBe(true);

    // 6. Fix validation issue in cold
    await actions.cold.setReplicas('1');
    runTimers();
    expect(actions.hot.hasErrorIndicator()).toBe(false);
    expect(actions.warm.hasErrorIndicator()).toBe(false);
    expect(actions.cold.hasErrorIndicator()).toBe(false);
  });

  test('global error callout should show, after clicking the "Save" button, if there are any form errors', async () => {
    const { actions } = testBed;

    expect(actions.hasGlobalErrorCallout()).toBe(false);
    expect(actions.hot.hasErrorIndicator()).toBe(false);
    expect(actions.warm.hasErrorIndicator()).toBe(false);
    expect(actions.cold.hasErrorIndicator()).toBe(false);

    await actions.saveAsNewPolicy(true);
    await actions.setPolicyName('');
    runTimers();
    await actions.savePolicy();

    expect(actions.hasGlobalErrorCallout()).toBe(true);
    expect(actions.hot.hasErrorIndicator()).toBe(false);
    expect(actions.warm.hasErrorIndicator()).toBe(false);
    expect(actions.cold.hasErrorIndicator()).toBe(false);
  });

  test('clears all error indicators if last erroring field is unmounted', async () => {
    const { actions } = testBed;

    await actions.cold.enable(true);
    await actions.cold.setMinAgeValue('7');
    // introduce validation error
    await actions.cold.setSearchableSnapshot('');
    runTimers();

    await actions.savePolicy();
    runTimers();

    expect(actions.hasGlobalErrorCallout()).toBe(true);
    expect(actions.hot.hasErrorIndicator()).toBe(false);
    expect(actions.warm.hasErrorIndicator()).toBe(false);
    expect(actions.cold.hasErrorIndicator()).toBe(true);

    // unmount the field
    await actions.cold.toggleSearchableSnapshot(false);

    expect(actions.hasGlobalErrorCallout()).toBe(false);
    expect(actions.hot.hasErrorIndicator()).toBe(false);
    expect(actions.warm.hasErrorIndicator()).toBe(false);
    expect(actions.cold.hasErrorIndicator()).toBe(false);
  });
});
