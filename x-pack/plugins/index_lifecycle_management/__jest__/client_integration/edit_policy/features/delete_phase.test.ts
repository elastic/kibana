/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { API_BASE_PATH } from '../../../../common/constants';
import { setupEnvironment } from '../../helpers';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';
import {
  DELETE_PHASE_POLICY,
  getDefaultHotPhasePolicy,
  NEW_SNAPSHOT_POLICY_NAME,
  SNAPSHOT_POLICY_NAME,
} from '../constants';

describe('<EditPolicy /> delete phase', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([DELETE_PHASE_POLICY]);
    httpRequestsMockHelpers.setLoadSnapshotPolicies([
      SNAPSHOT_POLICY_NAME,
      NEW_SNAPSHOT_POLICY_NAME,
    ]);

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
  });

  test('is hidden when disabled', async () => {
    httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);

    await act(async () => {
      testBed = await setup();
    });

    const { component, actions } = testBed;
    component.update();

    expect(actions.delete.isShown()).toBeFalsy();
    await actions.togglePhase('delete');
    expect(actions.delete.isShown()).toBeTruthy();
    await actions.togglePhase('delete');
    expect(actions.delete.isShown()).toBeFalsy();
  });

  test('shows timing after it was enabled', async () => {
    httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);

    await act(async () => {
      testBed = await setup();
    });

    const { component, actions } = testBed;
    component.update();

    expect(actions.delete.hasMinAgeInput()).toBeFalsy();
    await actions.togglePhase('delete');
    expect(actions.delete.hasMinAgeInput()).toBeTruthy();
  });

  describe('wait for snapshot', () => {
    test('shows snapshot policy name', () => {
      expect(testBed.find('snapshotPolicyCombobox').prop('data-currentvalue')).toEqual([
        {
          label: DELETE_PHASE_POLICY.policy.phases.delete?.actions.wait_for_snapshot?.policy,
        },
      ]);
    });

    test('updates snapshot policy name', async () => {
      const { actions } = testBed;

      await actions.delete.setWaitForSnapshotPolicy(NEW_SNAPSHOT_POLICY_NAME);
      await actions.savePolicy();

      const expected = {
        name: DELETE_PHASE_POLICY.name,
        phases: {
          ...DELETE_PHASE_POLICY.policy.phases,
          delete: {
            ...DELETE_PHASE_POLICY.policy.phases.delete,
            actions: {
              ...DELETE_PHASE_POLICY.policy.phases.delete?.actions,
              wait_for_snapshot: {
                policy: NEW_SNAPSHOT_POLICY_NAME,
              },
            },
          },
        },
      };

      const latestRequest = server.requests[server.requests.length - 1];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/policies`);
      expect(latestRequest.method).toBe('POST');
      expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
    });

    test('shows a callout when the input is not an existing policy', async () => {
      const { actions } = testBed;

      await actions.delete.setWaitForSnapshotPolicy('my_custom_policy');
      expect(testBed.find('noPoliciesCallout').exists()).toBeFalsy();
      expect(testBed.find('policiesErrorCallout').exists()).toBeFalsy();
      expect(testBed.find('customPolicyCallout').exists()).toBeTruthy();
    });

    test('removes the action if field is empty', async () => {
      const { actions } = testBed;

      await actions.delete.setWaitForSnapshotPolicy('');
      await actions.savePolicy();

      const expected = {
        name: DELETE_PHASE_POLICY.name,
        phases: {
          ...DELETE_PHASE_POLICY.policy.phases,
          delete: {
            ...DELETE_PHASE_POLICY.policy.phases.delete,
            actions: {
              ...DELETE_PHASE_POLICY.policy.phases.delete?.actions,
            },
          },
        },
      };

      delete expected.phases.delete.actions.wait_for_snapshot;

      const latestRequest = server.requests[server.requests.length - 1];
      expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
    });

    test('shows a callout when there are no snapshot policies', async () => {
      // need to call setup on testBed again for it to use a newly defined snapshot policies response
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
      await act(async () => {
        testBed = await setup();
      });

      testBed.component.update();
      expect(testBed.find('customPolicyCallout').exists()).toBeFalsy();
      expect(testBed.find('policiesErrorCallout').exists()).toBeFalsy();
      expect(testBed.find('noPoliciesCallout').exists()).toBeTruthy();
    });

    test('shows a callout when there is an error loading snapshot policies', async () => {
      // need to call setup on testBed again for it to use a newly defined snapshot policies response
      httpRequestsMockHelpers.setLoadSnapshotPolicies([], { status: 500, body: 'error' });
      await act(async () => {
        testBed = await setup();
      });

      testBed.component.update();
      expect(testBed.find('customPolicyCallout').exists()).toBeFalsy();
      expect(testBed.find('noPoliciesCallout').exists()).toBeFalsy();
      expect(testBed.find('policiesErrorCallout').exists()).toBeTruthy();
    });
  });
});
