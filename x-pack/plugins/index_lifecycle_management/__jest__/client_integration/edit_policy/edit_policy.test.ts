/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers/setup_environment';
import { EditPolicyTestBed, setup } from './edit_policy.helpers';

import { API_BASE_PATH } from '../../../common/constants';
import {
  DELETE_PHASE_POLICY,
  NEW_SNAPSHOT_POLICY_NAME,
  SNAPSHOT_POLICY_NAME,
  POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION,
  POLICY_WITH_NODE_ROLE_ALLOCATION,
} from './constants';

window.scrollTo = jest.fn();

describe('<EditPolicy />', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  afterAll(() => {
    server.restore();
  });

  describe('delete phase', () => {
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

    test('wait for snapshot policy field should correctly display snapshot policy name', () => {
      expect(testBed.find('snapshotPolicyCombobox').prop('data-currentvalue')).toEqual([
        {
          label: DELETE_PHASE_POLICY.policy.phases.delete?.actions.wait_for_snapshot?.policy,
          value: DELETE_PHASE_POLICY.policy.phases.delete?.actions.wait_for_snapshot?.policy,
        },
      ]);
    });

    test('wait for snapshot field should correctly update snapshot policy name', async () => {
      const { actions } = testBed;

      await actions.setWaitForSnapshotPolicy(NEW_SNAPSHOT_POLICY_NAME);
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

    test('wait for snapshot field should display a callout when the input is not an existing policy', async () => {
      const { actions } = testBed;

      await actions.setWaitForSnapshotPolicy('my_custom_policy');
      expect(testBed.find('noPoliciesCallout').exists()).toBeFalsy();
      expect(testBed.find('policiesErrorCallout').exists()).toBeFalsy();
      expect(testBed.find('customPolicyCallout').exists()).toBeTruthy();
    });

    test('wait for snapshot field should delete action if field is empty', async () => {
      const { actions } = testBed;

      actions.setWaitForSnapshotPolicy('');
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

    test('wait for snapshot field should display a callout when there are no snapshot policies', async () => {
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

    test('wait for snapshot field should display a callout when there is an error loading snapshot policies', async () => {
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

  describe('data allocation', () => {
    describe('node roles', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_NODE_ROLE_ALLOCATION]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });

        await act(async () => {
          testBed = await setup();
        });

        const { component } = testBed;
        component.update();
      });
      test('showing "default" type', () => {
        const { find } = testBed;
        expect(find('warm-dataTierAllocationControls.dataTierSelect').text()).toContain(
          'recommended'
        );
        expect(find('warm-dataTierAllocationControls.dataTierSelect').text()).not.toContain(
          'Custom'
        );
        expect(find('warm-dataTierAllocationControls.dataTierSelect').text()).not.toContain('Off');
      });
    });
    describe('node attr and none', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });

        await act(async () => {
          testBed = await setup();
        });

        const { component } = testBed;
        component.update();
      });

      test('showing "custom" and "off" types', () => {
        const { find } = testBed;
        expect(find('warm-dataTierAllocationControls.dataTierSelect').text()).toContain('Custom');
        expect(find('cold-dataTierAllocationControls.dataTierSelect').text()).toContain('Off');
      });
    });
  });
});
