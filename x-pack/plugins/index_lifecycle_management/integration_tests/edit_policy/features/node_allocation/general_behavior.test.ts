/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { HttpFetchOptionsWithPath } from '@kbn/core/public';
import { setupEnvironment } from '../../../helpers';
import {
  GeneralNodeAllocationTestBed,
  setupGeneralNodeAllocation,
} from './general_behavior.helpers';
import {
  POLICY_WITH_MIGRATE_OFF,
  POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION,
  POLICY_WITH_NODE_ROLE_ALLOCATION,
} from '../../constants';
import { API_BASE_PATH } from '../../../../common/constants';

describe('<EditPolicy /> node allocation general behavior', () => {
  let testBed: GeneralNodeAllocationTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const setup = async () => {
    await act(async () => {
      testBed = await setupGeneralNodeAllocation(httpSetup);
    });
  };

  describe('data allocation', () => {
    test('setting node_attr based allocation, but not selecting node attribute', async () => {
      httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_MIGRATE_OFF]);
      httpRequestsMockHelpers.setListNodes({
        nodesByRoles: {},
        nodesByAttributes: { test: ['123'] },
        isUsingDeprecatedDataRoleConfig: false,
      });
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

      await setup();

      const { component, actions } = testBed;
      component.update();

      await actions.setDataAllocation('node_attrs');
      await actions.savePolicy();

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(parsedReqBody.phases.warm.actions.migrate).toEqual({ enabled: false });
    });

    describe('node roles', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_NODE_ROLE_ALLOCATION]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });

        await setup();

        const { component } = testBed;
        component.update();
      });

      test('detecting use of the recommended allocation type', () => {
        const { find } = testBed;
        const selectedDataAllocation = find(
          'warm-dataTierAllocationControls.dataTierSelect'
        ).text();
        expect(selectedDataAllocation).toBe('Use warm nodes (recommended)');
      });

      test('setting replicas serialization', async () => {
        const { actions } = testBed;

        await actions.setReplicas('123');
        await actions.savePolicy();

        const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
        const [requestUrl, requestBody] = lastReq;
        const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

        expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
        expect(parsedReqBody.phases.warm.actions).toMatchInlineSnapshot(`
          Object {
            "allocate": Object {
              "number_of_replicas": 123,
            },
          }
        `);
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

        await setup();

        const { component } = testBed;
        component.update();
      });

      test('detecting use of the custom allocation type', () => {
        const { find } = testBed;
        expect(find('warm-dataTierAllocationControls.dataTierSelect').text()).toBe('Custom');
      });

      test('detecting use of the "off" allocation type', () => {
        const { find } = testBed;
        expect(find('cold-dataTierAllocationControls.dataTierSelect').text()).toContain('Off');
      });
    });
  });
});
