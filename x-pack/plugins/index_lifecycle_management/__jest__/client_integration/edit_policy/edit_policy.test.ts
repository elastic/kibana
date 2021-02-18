/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { licensingMock } from '../../../../licensing/public/mocks';
import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment } from '../helpers/setup_environment';
import { EditPolicyTestBed, setup } from './edit_policy.helpers';

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
      await actions.delete.disablePhase();
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
            min_age: '0d',
          },
        },
      });
    });
  });

  describe('hot phase', () => {
    describe('serialization', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
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

      test('setting all values', async () => {
        const { actions } = testBed;

        await actions.hot.toggleDefaultRollover(false);
        await actions.hot.setMaxSize('123', 'mb');
        await actions.hot.setMaxDocs('123');
        await actions.hot.setMaxAge('123', 'h');
        await actions.hot.toggleForceMerge(true);
        await actions.hot.setForcemergeSegmentsCount('123');
        await actions.hot.setBestCompression(true);
        await actions.hot.toggleShrink(true);
        await actions.hot.setShrink('2');
        await actions.hot.setReadonly(true);
        await actions.hot.toggleIndexPriority(true);
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
                  "readonly": Object {},
                  "rollover": Object {
                    "max_age": "123h",
                    "max_docs": 123,
                    "max_size": "123mb",
                  },
                  "set_priority": Object {
                    "priority": 123,
                  },
                  "shrink": Object {
                    "number_of_shards": 2,
                  },
                },
                "min_age": "0ms",
              },
            },
          }
        `);
      });

      test('setting searchable snapshot', async () => {
        const { actions } = testBed;

        await actions.hot.setSearchableSnapshot('my-repo');

        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const entirePolicy = JSON.parse(JSON.parse(latestRequest.requestBody).body);
        expect(entirePolicy.phases.hot.actions.searchable_snapshot.snapshot_repository).toBe(
          'my-repo'
        );
      });

      test('disabling rollover', async () => {
        const { actions } = testBed;
        await actions.hot.toggleDefaultRollover(false);
        await actions.hot.toggleRollover(false);
        await actions.savePolicy();
        const latestRequest = server.requests[server.requests.length - 1];
        const policy = JSON.parse(JSON.parse(latestRequest.requestBody).body);
        const hotActions = policy.phases.hot.actions;
        const rolloverAction = hotActions.rollover;
        expect(rolloverAction).toBe(undefined);
        expect(hotActions).toMatchInlineSnapshot(`Object {}`);
      });

      test('enabling searchable snapshot should hide force merge, freeze and shrink in subsequent phases', async () => {
        const { actions } = testBed;

        await actions.warm.enable(true);
        await actions.cold.enable(true);

        expect(actions.warm.forceMergeFieldExists()).toBeTruthy();
        expect(actions.warm.shrinkExists()).toBeTruthy();
        expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
        expect(actions.cold.freezeExists()).toBeTruthy();

        await actions.hot.setSearchableSnapshot('my-repo');

        expect(actions.warm.forceMergeFieldExists()).toBeFalsy();
        expect(actions.warm.shrinkExists()).toBeFalsy();
        // searchable snapshot in cold is still visible
        expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
        expect(actions.cold.freezeExists()).toBeFalsy();
      });

      test('disabling rollover toggle, but enabling default rollover', async () => {
        const { actions } = testBed;
        await actions.hot.toggleDefaultRollover(false);
        await actions.hot.toggleRollover(false);
        await actions.hot.toggleDefaultRollover(true);

        expect(actions.hot.forceMergeFieldExists()).toBeTruthy();
        expect(actions.hot.shrinkExists()).toBeTruthy();
        expect(actions.hot.searchableSnapshotsExists()).toBeTruthy();
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
            "min_age": "0d",
          }
        `);
      });

      test('setting all values', async () => {
        const { actions } = testBed;
        await actions.warm.enable(true);
        await actions.warm.setDataAllocation('node_attrs');
        await actions.warm.setSelectedNodeAttribute('test:123');
        await actions.warm.setReplicas('123');
        await actions.warm.toggleShrink(true);
        await actions.warm.setShrink('123');
        await actions.warm.toggleForceMerge(true);
        await actions.warm.setForcemergeSegmentsCount('123');
        await actions.warm.setBestCompression(true);
        await actions.warm.setReadonly(true);
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
                  "readonly": Object {},
                  "set_priority": Object {
                    "priority": 123,
                  },
                  "shrink": Object {
                    "number_of_shards": 123,
                  },
                },
                "min_age": "0d",
              },
            },
          }
        `);
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

      test('setting all values, excluding searchable snapshot', async () => {
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
                },
                "min_age": "0ms",
              },
            },
          }
        `);
      });

      // Setting searchable snapshot field disables setting replicas so we test this separately
      test('setting searchable snapshot', async () => {
        const { actions } = testBed;
        await actions.cold.enable(true);
        await actions.cold.setSearchableSnapshot('my-repo');
        await actions.savePolicy();
        const latestRequest2 = server.requests[server.requests.length - 1];
        const entirePolicy2 = JSON.parse(JSON.parse(latestRequest2.requestBody).body);
        expect(entirePolicy2.phases.cold.actions.searchable_snapshot.snapshot_repository).toEqual(
          'my-repo'
        );
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

    test('serialization', async () => {
      httpRequestsMockHelpers.setLoadPolicies([DEFAULT_POLICY]);
      await act(async () => {
        testBed = await setup();
      });
      const { component, actions } = testBed;
      component.update();
      await actions.delete.enablePhase();
      await actions.setWaitForSnapshotPolicy('test');
      await actions.savePolicy();
      const latestRequest = server.requests[server.requests.length - 1];
      const entirePolicy = JSON.parse(JSON.parse(latestRequest.requestBody).body);
      expect(entirePolicy.phases.delete).toEqual({
        min_age: '365d',
        actions: {
          delete: {},
          wait_for_snapshot: {
            policy: 'test',
          },
        },
      });
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

  describe('searchable snapshot', () => {
    describe('on cloud', () => {
      describe('new policy', () => {
        beforeEach(async () => {
          // simulate creating a new policy
          httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('')]);
          httpRequestsMockHelpers.setListNodes({
            isUsingDeprecatedDataRoleConfig: false,
            nodesByAttributes: { test: ['123'] },
            nodesByRoles: { data: ['123'] },
          });
          httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['found-snapshots'] });

          await act(async () => {
            testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
          });

          const { component } = testBed;
          component.update();
        });
        test('defaults searchable snapshot to true on cloud', async () => {
          const { find, actions } = testBed;
          await actions.cold.enable(true);
          expect(
            find('searchableSnapshotField-cold.searchableSnapshotToggle').props()['aria-checked']
          ).toBe(true);
        });
      });
      describe('existing policy', () => {
        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
          httpRequestsMockHelpers.setListNodes({
            isUsingDeprecatedDataRoleConfig: false,
            nodesByAttributes: { test: ['123'] },
            nodesByRoles: { data: ['123'] },
          });
          httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['found-snapshots'] });

          await act(async () => {
            testBed = await setup({ appServicesContext: { cloud: { isCloudEnabled: true } } });
          });

          const { component } = testBed;
          component.update();
        });
        test('correctly sets snapshot repository default to "found-snapshots"', async () => {
          const { actions } = testBed;
          await actions.cold.enable(true);
          await actions.cold.toggleSearchableSnapshot(true);
          await actions.savePolicy();
          const latestRequest = server.requests[server.requests.length - 1];
          const request = JSON.parse(JSON.parse(latestRequest.requestBody).body);
          expect(request.phases.cold.actions.searchable_snapshot.snapshot_repository).toEqual(
            'found-snapshots'
          );
        });
      });
    });
    describe('on non-enterprise license', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
        httpRequestsMockHelpers.setListNodes({
          isUsingDeprecatedDataRoleConfig: false,
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['123'] },
        });
        httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['found-snapshots'] });

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
      test('disable setting searchable snapshots', async () => {
        const { actions } = testBed;

        expect(actions.cold.searchableSnapshotsExists()).toBeFalsy();
        expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();

        await actions.cold.enable(true);

        // Still hidden in hot
        expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();

        expect(actions.cold.searchableSnapshotsExists()).toBeTruthy();
        expect(actions.cold.searchableSnapshotDisabledDueToLicense()).toBeTruthy();
      });
    });
  });
  describe('with rollover', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
      httpRequestsMockHelpers.setListNodes({
        isUsingDeprecatedDataRoleConfig: false,
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['123'] },
      });
      httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['abc'] });
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

      await act(async () => {
        testBed = await setup();
      });

      const { component } = testBed;
      component.update();
    });

    test('shows rollover tip on minimum age', async () => {
      const { actions } = testBed;

      await actions.warm.enable(true);
      await actions.cold.enable(true);
      await actions.delete.enablePhase();

      expect(actions.warm.hasRolloverTipOnMinAge()).toBeTruthy();
      expect(actions.cold.hasRolloverTipOnMinAge()).toBeTruthy();
      expect(actions.delete.hasRolloverTipOnMinAge()).toBeTruthy();
    });
  });

  describe('without rollover', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
      httpRequestsMockHelpers.setListNodes({
        isUsingDeprecatedDataRoleConfig: false,
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['123'] },
      });
      httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['found-snapshots'] });
      httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

      await act(async () => {
        testBed = await setup({
          appServicesContext: {
            license: licensingMock.createLicense({ license: { type: 'enterprise' } }),
          },
        });
      });

      const { component } = testBed;
      component.update();
    });
    test('hiding and disabling searchable snapshot field', async () => {
      const { actions } = testBed;
      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.toggleRollover(false);
      await actions.cold.enable(true);

      expect(actions.hot.searchableSnapshotsExists()).toBeFalsy();
      expect(actions.cold.searchableSnapshotDisabledDueToRollover()).toBeTruthy();
    });

    test('hiding rollover tip on minimum age', async () => {
      const { actions } = testBed;
      await actions.hot.toggleDefaultRollover(false);
      await actions.hot.toggleRollover(false);

      await actions.warm.enable(true);
      await actions.cold.enable(true);
      await actions.delete.enablePhase();

      expect(actions.warm.hasRolloverTipOnMinAge()).toBeFalsy();
      expect(actions.cold.hasRolloverTipOnMinAge()).toBeFalsy();
      expect(actions.delete.hasRolloverTipOnMinAge()).toBeFalsy();
    });
  });

  describe('policy timeline', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
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

      await actions.delete.enablePhase();
      expect(actions.timeline.hasHotPhase()).toBe(true);
      expect(actions.timeline.hasWarmPhase()).toBe(true);
      expect(actions.timeline.hasColdPhase()).toBe(true);
      expect(actions.timeline.hasDeletePhase()).toBe(true);
    });
  });

  describe('policy error notifications', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy('my_policy')]);
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

    // For new we rely on a setTimeout to ensure that error messages have time to populate
    // the form object before we look at the form object. See:
    // x-pack/plugins/index_lifecycle_management/public/application/sections/edit_policy/form/form_errors_context.tsx
    // for where this logic lives.
    const runTimers = () => {
      const { component } = testBed;
      act(() => {
        jest.runAllTimers();
      });
      component.update();
    };

    test('shows phase error indicators correctly', async () => {
      // This test simulates a user configuring a policy phase by phase. The flow is the following:
      // 0. Start with policy with no validation issues present
      // 1. Configure hot, introducing a validation error
      // 2. Configure warm, introducing a validation error
      // 3. Configure cold, introducing a validation error
      // 4. Fix validation error in hot
      // 5. Fix validation error in warm
      // 6. Fix validation error in cold
      // We assert against each of these progressive states.

      const { actions } = testBed;

      // 0. No validation issues
      expect(actions.hasGlobalErrorCallout()).toBe(false);
      expect(actions.hot.hasErrorIndicator()).toBe(false);
      expect(actions.warm.hasErrorIndicator()).toBe(false);
      expect(actions.cold.hasErrorIndicator()).toBe(false);

      // 1. Hot phase validation issue
      await actions.hot.toggleForceMerge(true);
      await actions.hot.setForcemergeSegmentsCount('-22');
      runTimers();
      expect(actions.hasGlobalErrorCallout()).toBe(true);
      expect(actions.hot.hasErrorIndicator()).toBe(true);
      expect(actions.warm.hasErrorIndicator()).toBe(false);
      expect(actions.cold.hasErrorIndicator()).toBe(false);

      // 2. Warm phase validation issue
      await actions.warm.enable(true);
      await actions.warm.toggleForceMerge(true);
      await actions.warm.setForcemergeSegmentsCount('-22');
      runTimers();
      expect(actions.hasGlobalErrorCallout()).toBe(true);
      expect(actions.hot.hasErrorIndicator()).toBe(true);
      expect(actions.warm.hasErrorIndicator()).toBe(true);
      expect(actions.cold.hasErrorIndicator()).toBe(false);

      // 3. Cold phase validation issue
      await actions.cold.enable(true);
      await actions.cold.setReplicas('-33');
      runTimers();
      expect(actions.hasGlobalErrorCallout()).toBe(true);
      expect(actions.hot.hasErrorIndicator()).toBe(true);
      expect(actions.warm.hasErrorIndicator()).toBe(true);
      expect(actions.cold.hasErrorIndicator()).toBe(true);

      // 4. Fix validation issue in hot
      await actions.hot.setForcemergeSegmentsCount('1');
      runTimers();
      expect(actions.hasGlobalErrorCallout()).toBe(true);
      expect(actions.hot.hasErrorIndicator()).toBe(false);
      expect(actions.warm.hasErrorIndicator()).toBe(true);
      expect(actions.cold.hasErrorIndicator()).toBe(true);

      // 5. Fix validation issue in warm
      await actions.warm.setForcemergeSegmentsCount('1');
      runTimers();
      expect(actions.hasGlobalErrorCallout()).toBe(true);
      expect(actions.hot.hasErrorIndicator()).toBe(false);
      expect(actions.warm.hasErrorIndicator()).toBe(false);
      expect(actions.cold.hasErrorIndicator()).toBe(true);

      // 6. Fix validation issue in cold
      await actions.cold.setReplicas('1');
      runTimers();
      expect(actions.hasGlobalErrorCallout()).toBe(false);
      expect(actions.hot.hasErrorIndicator()).toBe(false);
      expect(actions.warm.hasErrorIndicator()).toBe(false);
      expect(actions.cold.hasErrorIndicator()).toBe(false);
    });

    test('global error callout should show if there are any form errors', async () => {
      const { actions } = testBed;

      expect(actions.hasGlobalErrorCallout()).toBe(false);
      expect(actions.hot.hasErrorIndicator()).toBe(false);
      expect(actions.warm.hasErrorIndicator()).toBe(false);
      expect(actions.cold.hasErrorIndicator()).toBe(false);

      await actions.saveAsNewPolicy(true);
      await actions.setPolicyName('');
      runTimers();

      expect(actions.hasGlobalErrorCallout()).toBe(true);
      expect(actions.hot.hasErrorIndicator()).toBe(false);
      expect(actions.warm.hasErrorIndicator()).toBe(false);
      expect(actions.cold.hasErrorIndicator()).toBe(false);
    });

    test('clears all error indicators if last erroring field is unmounted', async () => {
      const { actions } = testBed;

      await actions.cold.enable(true);
      // introduce validation error
      await actions.cold.setSearchableSnapshot('');
      runTimers();

      await actions.savePolicy();
      runTimers();

      expect(actions.hasGlobalErrorCallout()).toBe(true);
      expect(actions.hot.hasErrorIndicator()).toBe(false);
      expect(actions.warm.hasErrorIndicator()).toBe(false);
      expect(actions.cold.hasErrorIndicator()).toBe(true);

      // unmount the field
      await actions.cold.toggleSearchableSnapshot(false);

      expect(actions.hasGlobalErrorCallout()).toBe(false);
      expect(actions.hot.hasErrorIndicator()).toBe(false);
      expect(actions.warm.hasErrorIndicator()).toBe(false);
      expect(actions.cold.hasErrorIndicator()).toBe(false);
    });
  });
});
