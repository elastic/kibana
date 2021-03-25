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

describe('<EditPolicy /> timeline', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
    httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: {},
      nodesByAttributes: { test: ['123'] },
      isUsingDeprecatedDataRoleConfig: false,
    });

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
  });

  test('showing all phases on the timeline', async () => {
    const { actions } = testBed;
    // This is how the default policy should look
    expect(actions.timeline.hasHotPhase()).toBe(true);
    expect(actions.timeline.hasWarmPhase()).toBe(false);
    expect(actions.timeline.hasColdPhase()).toBe(false);
    expect(actions.timeline.hasDeletePhase()).toBe(false);

    await actions.warm.enable(true);
    expect(actions.timeline.hasHotPhase()).toBe(true);
    expect(actions.timeline.hasWarmPhase()).toBe(true);
    expect(actions.timeline.hasColdPhase()).toBe(false);
    expect(actions.timeline.hasDeletePhase()).toBe(false);

    await actions.cold.enable(true);
    expect(actions.timeline.hasHotPhase()).toBe(true);
    expect(actions.timeline.hasWarmPhase()).toBe(true);
    expect(actions.timeline.hasColdPhase()).toBe(true);
    expect(actions.timeline.hasDeletePhase()).toBe(false);

    await actions.delete.enable(true);
    expect(actions.timeline.hasHotPhase()).toBe(true);
    expect(actions.timeline.hasWarmPhase()).toBe(true);
    expect(actions.timeline.hasColdPhase()).toBe(true);
    expect(actions.timeline.hasDeletePhase()).toBe(true);
  });
});
