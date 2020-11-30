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
  DEFAULT_POLICY,
  POLICY_WITH_MIGRATE_OFF,
  POLICY_WITH_INCLUDE_EXCLUDE,
  POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION,
  POLICY_WITH_NODE_ROLE_ALLOCATION,
  POLICY_WITH_KNOWN_AND_UNKNOWN_FIELDS,
  getDefaultHotPhasePolicy,
} from './constants';

window.scrollTo = jest.fn();

describe('<EditPolicy />', () => {
  let testBed: EditPolicyTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  afterAll(() => {
    server.restore();
  });

  describe('serialization', () => {
    /**
     * We assume that policies that populate this form are loaded directly from ES and so
     * are valid according to ES. There may be settings in the policy created through the ILM
     * API that the UI does not cater for, like the unfollow action. We do not want to overwrite
     * the configuration for these actions in the UI.
     */
    it('preserves policy settings it did not configure', async () => {
      httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_KNOWN_AND_UNKNOWN_FIELDS]);
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
      httpRequestsMockHelpers.setListNodes({
        nodesByRoles: {},
        nodesByAttributes: { test: ['123'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      await act(async () => {
        testBed = await setup();
      });

      const { component, actions } = testBed;
      component.update();

      // Set max docs to test whether we keep the unknown fields in that object after serializing
      await actions.hot.setMaxDocs('1000');
      // Remove the delete phase to ensure that we also correctly remove data
      await actions.delete.enable(false);
      await actions.savePolicy();

      const latestRequest = server.requests[server.requests.length - 1];
      const entirePolicy = JSON.parse(JSON.parse(latestRequest.requestBody).body);

      expect(entirePolicy).toEqual({
        foo: 'bar', // Made up value
        name: 'my_policy',
        phases: {
          hot: {
            actions: {
              rollover: {
                max_docs: 1000,
                max_size: '50gb',
                unknown_setting: 123, // Made up setting that should stay preserved
              },
              set_priority: {
                priority: 100,
              },
            },
            min_age: '0ms',
          },
          warm: {
            actions: {
              my_unfollow_action: {}, // Made up action
              set_priority: {
                priority: 22,
                unknown_setting: true,
              },
            },
            min_age: '0ms',
          },
        },
      });
    });
  });

  describe('hot phase', () => {
    describe('serialization', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
        httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

        await act(async () => {
          testBed = await setup();
        });

        const { component } = testBed;
        component.update();
      });

      test('setting all values', async () => {
        const { actions } = testBed;

        await actions.hot.setMaxSize('123', 'mb');
        await actions.hot.setMaxDocs('123');
        await actions.hot.setMaxAge('123', 'h');
        await actions.hot.toggleForceMerge(true);
        await actions.hot.setForcemergeSegments('123');
        await actions.hot.setBestCompression(true);
        await actions.hot.setIndexPriority('123');

        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const entirePolicy = JSON.parse(JSON.parse(latestRequest.requestBody).body);
        expect(entirePolicy).toMatchInlineSnapshot(`
          Object {
            "name": "my_policy",
            "phases": Object {
              "hot": Object {
                "actions": Object {
                  "forcemerge": Object {
                    "index_codec": "best_compression",
                    "max_num_segments": 123,
                  },
                  "rollover": Object {
                    "max_age": "123h",
                    "max_docs": 123,
                    "max_size": "123mb",
                  },
                  "set_priority": Object {
                    "priority": 123,
                  },
                },
                "min_age": "0ms",
              },
            },
          }
        `);
      });

      test('disabling rollover', async () => {
        const { actions } = testBed;
        await actions.hot.toggleRollover(true);
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const policy = JSON.parse(JSON.parse(latestRequest.requestBody).body);
        const hotActions = policy.phases.hot.actions;
        const rolloverAction = hotActions.rollover;
        expect(rolloverAction).toBe(undefined);
        expect(hotActions).toMatchInlineSnapshot(`
          Object {
            "set_priority": Object {
              "priority": 100,
            },
          }
        `);
      });
    });
  });

  describe('warm phase', () => {
    describe('serialization', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([DEFAULT_POLICY]);
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
      });

      test('default values', async () => {
        const { actions } = testBed;
        await actions.warm.enable(true);
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const warmPhase = JSON.parse(JSON.parse(latestRequest.requestBody).body).phases.warm;
        expect(warmPhase).toMatchInlineSnapshot(`
          Object {
            "actions": Object {
              "set_priority": Object {
                "priority": 50,
              },
            },
            "min_age": "0ms",
          }
        `);
      });

      test('setting all values', async () => {
        const { actions } = testBed;
        await actions.warm.enable(true);
        await actions.warm.setMinAgeValue('123');
        await actions.warm.setMinAgeUnits('d');
        await actions.warm.setDataAllocation('node_attrs');
        await actions.warm.setSelectedNodeAttribute('test:123');
        await actions.warm.setReplicas('123');
        await actions.warm.setShrink('123');
        await actions.warm.toggleForceMerge(true);
        await actions.warm.setForcemergeSegments('123');
        await actions.warm.setBestCompression(true);
        await actions.warm.setIndexPriority('123');
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const entirePolicy = JSON.parse(JSON.parse(latestRequest.requestBody).body);
        // Check shape of entire policy
        expect(entirePolicy).toMatchInlineSnapshot(`
          Object {
            "name": "my_policy",
            "phases": Object {
              "hot": Object {
                "actions": Object {
                  "rollover": Object {
                    "max_age": "30d",
                    "max_size": "50gb",
                  },
                  "set_priority": Object {
                    "priority": 100,
                  },
                },
                "min_age": "0ms",
              },
              "warm": Object {
                "actions": Object {
                  "allocate": Object {
                    "number_of_replicas": 123,
                    "require": Object {
                      "test": "123",
                    },
                  },
                  "forcemerge": Object {
                    "index_codec": "best_compression",
                    "max_num_segments": 123,
                  },
                  "set_priority": Object {
                    "priority": 123,
                  },
                  "shrink": Object {
                    "number_of_shards": 123,
                  },
                },
                "min_age": "123d",
              },
            },
          }
        `);
      });

      test('setting warm phase on rollover to "true"', async () => {
        const { actions } = testBed;
        await actions.warm.enable(true);
        await actions.warm.warmPhaseOnRollover(true);
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const warmPhaseMinAge = JSON.parse(JSON.parse(latestRequest.requestBody).body).phases.warm
          .min_age;
        expect(warmPhaseMinAge).toBe(undefined);
      });
    });

    describe('policy with include and exclude', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_INCLUDE_EXCLUDE]);
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
      });

      test('preserves include, exclude allocation settings', async () => {
        const { actions } = testBed;
        await actions.warm.setDataAllocation('node_attrs');
        await actions.warm.setSelectedNodeAttribute('test:123');
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const warmPhaseAllocate = JSON.parse(JSON.parse(latestRequest.requestBody).body).phases.warm
          .actions.allocate;
        expect(warmPhaseAllocate).toMatchInlineSnapshot(`
          Object {
            "exclude": Object {
              "def": "456",
            },
            "include": Object {
              "abc": "123",
            },
            "require": Object {
              "test": "123",
            },
          }
        `);
      });
    });
  });

  describe('cold phase', () => {
    describe('serialization', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([DEFAULT_POLICY]);
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
      });

      test('default values', async () => {
        const { actions } = testBed;

        await actions.cold.enable(true);
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const entirePolicy = JSON.parse(JSON.parse(latestRequest.requestBody).body);
        expect(entirePolicy.phases.cold).toMatchInlineSnapshot(`
          Object {
            "actions": Object {
              "set_priority": Object {
                "priority": 0,
              },
            },
            "min_age": "0d",
          }
        `);
      });

      test('setting all values', async () => {
        const { actions } = testBed;

        await actions.cold.enable(true);
        await actions.cold.setMinAgeValue('123');
        await actions.cold.setMinAgeUnits('s');
        await actions.cold.setDataAllocation('node_attrs');
        await actions.cold.setSelectedNodeAttribute('test:123');
        await actions.cold.setReplicas('123');
        await actions.cold.setFreeze(true);
        await actions.cold.setIndexPriority('123');

        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const entirePolicy = JSON.parse(JSON.parse(latestRequest.requestBody).body);

        expect(entirePolicy).toMatchInlineSnapshot(`
          Object {
            "name": "my_policy",
            "phases": Object {
              "cold": Object {
                "actions": Object {
                  "allocate": Object {
                    "number_of_replicas": 123,
                    "require": Object {
                      "test": "123",
                    },
                  },
                  "freeze": Object {},
                  "set_priority": Object {
                    "priority": 123,
                  },
                },
                "min_age": "123s",
              },
              "hot": Object {
                "actions": Object {
                  "rollover": Object {
                    "max_age": "30d",
                    "max_size": "50gb",
                  },
                  "set_priority": Object {
                    "priority": 100,
                  },
                },
                "min_age": "0ms",
              },
            },
          }
        `);
      });
    });
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

      await actions.setWaitForSnapshotPolicy('');
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
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_MIGRATE_OFF]);
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
    });

    test('setting node_attr based allocation, but not selecting node attribute', async () => {
      const { actions } = testBed;
      await actions.warm.setDataAllocation('node_attrs');
      await actions.savePolicy();
      const latestRequest = server.requests[server.requests.length - 1];
      const warmPhase = JSON.parse(JSON.parse(latestRequest.requestBody).body).phases.warm;

      expect(warmPhase.actions.migrate).toEqual({ enabled: false });
    });

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

      test('detecting use of the recommended allocation type', () => {
        const { find } = testBed;
        const selectedDataAllocation = find(
          'warm-dataTierAllocationControls.dataTierSelect'
        ).text();
        expect(selectedDataAllocation).toBe('Use warm nodes (recommended)');
      });

      test('setting replicas serialization', async () => {
        const { actions } = testBed;
        await actions.warm.setReplicas('123');
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const warmPhaseActions = JSON.parse(JSON.parse(latestRequest.requestBody).body).phases.warm
          .actions;
        expect(warmPhaseActions).toMatchInlineSnapshot(`
          Object {
            "allocate": Object {
              "number_of_replicas": 123,
            },
            "set_priority": Object {
              "priority": 50,
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

        await act(async () => {
          testBed = await setup();
        });

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
