/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setupRequestFlyoutTestBed, RequestFlyoutTestBed } from './request_flyout.helpers';
import { getDefaultHotPhasePolicy } from '../constants';

describe('<EditPolicy /> request flyout', () => {
  let testBed: RequestFlyoutTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupRequestFlyoutTestBed();
    });

    const { component } = testBed;
    component.update();
  });

  test('renders a json in flyout for a default policy', async () => {
    const { actions } = testBed;
    await actions.openRequestFlyout();

    const json = actions.getRequestJson();
    const expected = `PUT _ilm/policy/my_policy\n${JSON.stringify(
      {
        policy: {
          phases: { ...getDefaultHotPhasePolicy().policy.phases },
        },
      },
      null,
      2
    )}`;
    expect(json).toBe(expected);
  });

  test('renders an error callout if policy form is invalid', async () => {
    const { actions } = testBed;
    // toggle warm phase but don't set phase timing to create an invalid policy
    await actions.togglePhase('warm');
    await actions.openRequestFlyout();
    expect(actions.hasInvalidPolicyAlert()).toBe(true);
    expect(actions.hasRequestJson()).toBe(false);
    await actions.closeRequestFlyout();

    // set phase timing to "fix" the invalid policy
    await actions.warm.setMinAgeValue('10');
    await actions.openRequestFlyout();
    expect(actions.hasInvalidPolicyAlert()).toBe(false);
    expect(actions.hasRequestJson()).toBe(true);
  });

  test('renders a json with default policy name when only policy name is missing', async () => {
    const { actions } = testBed;
    // delete the name of the the policy which is currently valid
    await actions.toggleSaveAsNewPolicy();
    await actions.setPolicyName('');
    await actions.openRequestFlyout();

    // the json still works, no "invalid policy" alert
    expect(actions.hasInvalidPolicyAlert()).toBe(false);
    expect(actions.hasRequestJson()).toBe(true);

    const json = actions.getRequestJson();
    const expected = `PUT _ilm/policy/<policyName>\n${JSON.stringify(
      {
        policy: {
          phases: { ...getDefaultHotPhasePolicy().policy.phases },
        },
      },
      null,
      2
    )}`;
    expect(json).toBe(expected);
  });
});
