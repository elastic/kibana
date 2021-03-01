/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers/setup_environment';
import { EditPolicyTestBed, setup } from '../edit_policy.helpers';
import { DEFAULT_POLICY } from '../constants';

describe('<EditPolicy /> reactive form', () => {
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
    httpRequestsMockHelpers.setLoadPolicies([DEFAULT_POLICY]);
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

  describe('rollover', () => {
    test('shows forcemerge when rollover enabled', async () => {
      const { actions } = testBed;
      expect(actions.hot.forceMergeFieldExists()).toBeTruthy();
    });
    test('hides forcemerge when rollover is disabled', async () => {
      const { actions } = testBed;
      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.toggleRollover(false);
      expect(actions.hot.forceMergeFieldExists()).toBeFalsy();
    });

    test('shows shrink input when rollover enabled', async () => {
      const { actions } = testBed;
      expect(actions.hot.shrinkExists()).toBeTruthy();
    });
    test('hides shrink input when rollover is disabled', async () => {
      const { actions } = testBed;
      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.toggleRollover(false);
      expect(actions.hot.shrinkExists()).toBeFalsy();
    });
    test('shows readonly input when rollover enabled', async () => {
      const { actions } = testBed;
      expect(actions.hot.readonlyExists()).toBeTruthy();
    });
    test('hides readonly input when rollover is disabled', async () => {
      const { actions } = testBed;
      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.toggleRollover(false);
      expect(actions.hot.readonlyExists()).toBeFalsy();
    });
  });

  describe('timing', () => {
    test('warm phase shows timing only when enabled', async () => {
      const { actions } = testBed;
      expect(actions.warm.hasMinAgeInput()).toBeFalsy();
      await actions.warm.enable(true);
      expect(actions.warm.hasMinAgeInput()).toBeTruthy();
    });

    test('cold phase shows timing only when enabled', async () => {
      const { actions } = testBed;
      expect(actions.cold.hasMinAgeInput()).toBeFalsy();
      await actions.cold.enable(true);
      expect(actions.cold.hasMinAgeInput()).toBeTruthy();
    });

    test('delete phase shows timing after it was enabled', async () => {
      const { actions } = testBed;
      expect(actions.delete.hasMinAgeInput()).toBeFalsy();
      await actions.delete.enablePhase();
      expect(actions.delete.hasMinAgeInput()).toBeTruthy();
    });
  });

  describe('delete phase', () => {
    test('is hidden when disabled', async () => {
      const { actions } = testBed;
      expect(actions.delete.isShown()).toBeFalsy();
      await actions.delete.enablePhase();
      expect(actions.delete.isShown()).toBeTruthy();
    });
  });

  describe('json in flyout', () => {
    test('renders a json in flyout for a default policy', async () => {
      const { find, component } = testBed;
      await act(async () => {
        find('requestButton').simulate('click');
      });
      component.update();

      const json = component.find(`code`).text();
      const expected = `PUT _ilm/policy/my_policy\n${JSON.stringify(
        {
          policy: {
            phases: {
              hot: {
                min_age: '0ms',
                actions: {
                  rollover: {
                    max_age: '30d',
                    max_size: '50gb',
                  },
                },
              },
            },
          },
        },
        null,
        2
      )}`;
      expect(json).toBe(expected);
    });
  });
});
