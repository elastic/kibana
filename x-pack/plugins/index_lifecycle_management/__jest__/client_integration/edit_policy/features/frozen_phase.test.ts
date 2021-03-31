/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { licensingMock } from '../../../../../licensing/public/mocks';
import { setupEnvironment } from '../../helpers/setup_environment';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';
import { getDefaultHotPhasePolicy } from '../constants';

describe('<EditPolicy /> frozen phase', () => {
  let testBed: EditPolicyTestBed;
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
      nodesByRoles: { data: ['node1'] },
      nodesByAttributes: { 'attribute:true': ['node1'] },
      isUsingDeprecatedDataRoleConfig: true,
    });
    httpRequestsMockHelpers.setNodesDetails('attribute:true', [
      { nodeId: 'testNodeId', stats: { name: 'testNodeName', host: 'testHost' } },
    ]);
    httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

    await act(async () => {
      testBed = await setup();
    });

    const { component } = testBed;
    component.update();
  });

  test('shows timing only when enabled', async () => {
    const { actions, exists } = testBed;

    expect(exists('frozen-phase')).toBe(true);
    expect(actions.frozen.hasMinAgeInput()).toBeFalsy();
    await actions.frozen.enable(true);
    expect(actions.frozen.hasMinAgeInput()).toBeTruthy();
  });

  describe('on non-enterprise license', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
      httpRequestsMockHelpers.setListNodes({
        isUsingDeprecatedDataRoleConfig: false,
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['123'] },
      });
      httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['my-repo'] });

      await act(async () => {
        testBed = await setup({
          appServicesContext: {
            license: licensingMock.createLicense({ license: { type: 'basic' } }),
          },
        });
      });

      const { component } = testBed;
      component.update();
    });

    test('should not be available', async () => {
      const { exists } = testBed;
      expect(exists('frozen-phase')).toBe(false);
    });
  });
});
