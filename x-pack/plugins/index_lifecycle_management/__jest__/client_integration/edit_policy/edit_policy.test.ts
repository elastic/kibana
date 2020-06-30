/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers/setup_environment';

import { EditPolicyTestBed, setup } from './edit_policy.helpers';
import { DELETE_PHASE_POLICY } from './constants';

import { API_BASE_PATH } from '../../../common/constants';

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

      await act(async () => {
        testBed = await setup();
      });

      const { component } = testBed;
      component.update();
    });

    test('wait for snapshot policy field should correctly display snapshot policy name', () => {
      expect(testBed.find('waitForSnapshotField').props().value).toEqual(
        DELETE_PHASE_POLICY.policy.phases.delete.actions.wait_for_snapshot.policy
      );
    });

    test('wait for snapshot field should correctly update snapshot policy name', async () => {
      const { actions } = testBed;

      const newPolicyName = 'my_new_snapshot_policy';
      actions.setWaitForSnapshotPolicy(newPolicyName);
      await actions.savePolicy();

      const expected = {
        name: DELETE_PHASE_POLICY.name,
        phases: {
          ...DELETE_PHASE_POLICY.policy.phases,
          delete: {
            ...DELETE_PHASE_POLICY.policy.phases.delete,
            actions: {
              ...DELETE_PHASE_POLICY.policy.phases.delete.actions,
              wait_for_snapshot: {
                policy: newPolicyName,
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
              ...DELETE_PHASE_POLICY.policy.phases.delete.actions,
            },
          },
        },
      };
      delete expected.phases.delete.actions.wait_for_snapshot;

      const latestRequest = server.requests[server.requests.length - 1];
      expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
    });
  });
});
