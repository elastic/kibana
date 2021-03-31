/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers/setup_environment';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';
import { getDefaultHotPhasePolicy } from '../constants';

describe('<EditPolicy /> warm phase', () => {
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
    const { actions } = testBed;
    expect(actions.warm.hasMinAgeInput()).toBeFalsy();
    await actions.warm.enable(true);
    expect(actions.warm.hasMinAgeInput()).toBeTruthy();
  });
});
