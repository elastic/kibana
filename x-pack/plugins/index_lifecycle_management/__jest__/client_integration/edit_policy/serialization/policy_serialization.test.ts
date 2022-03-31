/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { HttpFetchOptionsWithPath } from 'kibana/public';
import { setupEnvironment } from '../../helpers';
import { API_BASE_PATH } from '../../../../common/constants';
import {
  getDefaultHotPhasePolicy,
  POLICY_WITH_INCLUDE_EXCLUDE,
  POLICY_WITH_KNOWN_AND_UNKNOWN_FIELDS,
} from '../constants';
import { SerializationTestBed, setupSerializationTestBed } from './policy_serialization.helpers';

describe('<EditPolicy /> serialization', () => {
  let testBed: SerializationTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupSerializationTestBed(httpSetup);
    });

    const { component } = testBed;
    component.update();
  });

  describe('top level form', () => {
    /**
     * We assume that policies that populate this form are loaded directly from ES and so
     * are valid according to ES. There may be settings in the policy created through the ILM
     * API that the UI does not cater for, like the unfollow action. We do not want to overwrite
     * the configuration for these actions in the UI.
     */
    it('preserves policy settings it did not configure', async () => {
      httpRequestsMockHelpers.setLoadPolicies([POLICY_WITH_KNOWN_AND_UNKNOWN_FIELDS]);
      await act(async () => {
        testBed = await setupSerializationTestBed(httpSetup);
      });

      const { component, actions } = testBed;
      component.update();

      // Set max docs to test whether we keep the unknown fields in that object after serializing
      await actions.rollover.setMaxDocs('1000');
      // Remove the delete phase to ensure that we also correctly remove data
      await actions.togglePhase('delete');
      await actions.savePolicy();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/policies`,
        expect.objectContaining({
          body: JSON.stringify({
            foo: 'bar', // Made up value
            phases: {
              hot: {
                min_age: '0ms',
                actions: {
                  rollover: {
                    unknown_setting: 123, // Made up setting that should stay preserved
                    max_size: '50gb',
                    max_docs: 1000,
                  },
                },
              },
              warm: {
                min_age: '10d',
                actions: {
                  my_unfollow_action: {}, // Made up action
                  set_priority: {
                    priority: 22,
                    unknown_setting: true,
                  },
                },
              },
            },
            name: 'my_policy',
          }),
        })
      );
    });

    it('default policy (only policy name input) on enterprise license', async () => {
      httpRequestsMockHelpers.setLoadPolicies([]);

      await act(async () => {
        testBed = await setupSerializationTestBed(httpSetup);
      });

      const { component, actions } = testBed;
      component.update();
      await actions.setPolicyName('test_policy');
      await actions.savePolicy();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/policies`,
        expect.objectContaining({
          body: JSON.stringify({
            name: 'test_policy',
            phases: {
              hot: {
                actions: {
                  rollover: {
                    max_age: '30d',
                    max_primary_shard_size: '50gb',
                  },
                  set_priority: {
                    priority: 100,
                  },
                },
                min_age: '0ms',
              },
            },
          }),
        })
      );
    });

    it('default policy (only policy name input) on basic license', async () => {
      httpRequestsMockHelpers.setLoadPolicies([]);

      await act(async () => {
        testBed = await setupSerializationTestBed(httpSetup, {
          appServicesContext: {
            license: licensingMock.createLicense({ license: { type: 'basic' } }),
          },
        });
      });

      const { component, actions } = testBed;
      component.update();
      await actions.setPolicyName('test_policy');
      await actions.savePolicy();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/policies`,
        expect.objectContaining({
          body: JSON.stringify({
            name: 'test_policy',
            phases: {
              hot: {
                actions: {
                  rollover: {
                    max_age: '30d',
                    max_primary_shard_size: '50gb',
                  },
                  set_priority: {
                    priority: 100,
                  },
                },
                min_age: '0ms',
              },
            },
          }),
        })
      );
    });
  });

  describe('hot phase', () => {
    test('setting all values', async () => {
      const { actions } = testBed;

      await actions.rollover.toggleDefault();
      await actions.rollover.setMaxSize('123', 'mb');
      await actions.rollover.setMaxDocs('123');
      await actions.rollover.setMaxAge('123', 'h');
      await actions.hot.toggleForceMerge();
      await actions.hot.setForcemergeSegmentsCount('123');
      await actions.hot.setBestCompression(true);
      await actions.hot.setShrinkCount('2');
      await actions.hot.toggleReadonly();
      await actions.hot.setIndexPriority('123');

      await actions.savePolicy();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/policies`,
        expect.objectContaining({
          body: JSON.stringify({
            name: 'my_policy',
            phases: {
              hot: {
                min_age: '0ms',
                actions: {
                  rollover: {
                    max_age: '123h',
                    max_primary_shard_size: '50gb',
                    max_docs: 123,
                    max_size: '123mb',
                  },
                  forcemerge: {
                    max_num_segments: 123,
                    index_codec: 'best_compression',
                  },
                  shrink: {
                    number_of_shards: 2,
                  },
                  set_priority: {
                    priority: 123,
                  },
                  readonly: {},
                },
              },
            },
          }),
        })
      );
    });

    test('setting searchable snapshot', async () => {
      const { actions } = testBed;

      await actions.hot.setSearchableSnapshot('my-repo');

      await actions.savePolicy();

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(parsedReqBody.phases.hot.actions.searchable_snapshot.snapshot_repository).toBe(
        'my-repo'
      );
    });

    test('disabling rollover', async () => {
      const { actions } = testBed;

      await actions.rollover.toggleDefault();
      await actions.rollover.toggle();

      await actions.savePolicy();

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      const hotActions = parsedReqBody.phases.hot.actions;
      const rolloverAction = hotActions.rollover;

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(rolloverAction).toBe(undefined);
      expect(hotActions).toMatchInlineSnapshot(`Object {}`);
    });
  });

  describe('warm phase', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();

      await act(async () => {
        testBed = await setupSerializationTestBed(httpSetup);
      });

      const { component } = testBed;
      component.update();
    });

    test('default values', async () => {
      const { actions } = testBed;
      await actions.togglePhase('warm');
      await actions.warm.setMinAgeValue('11');
      await actions.savePolicy();

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(parsedReqBody.phases.warm).toMatchInlineSnapshot(`
          Object {
            "actions": Object {
              "set_priority": Object {
                "priority": 50,
              },
            },
            "min_age": "11d",
          }
        `);
    });

    test('setting all values', async () => {
      const { actions } = testBed;
      await actions.togglePhase('warm');
      await actions.warm.setMinAgeValue('11');
      await actions.warm.setDataAllocation('node_attrs');
      await actions.warm.setSelectedNodeAttribute('test:123');
      await actions.warm.setReplicas('123');
      await actions.warm.setShrinkCount('123');
      await actions.warm.toggleForceMerge();
      await actions.warm.setForcemergeSegmentsCount('123');
      await actions.warm.setBestCompression(true);
      await actions.warm.toggleReadonly();
      await actions.warm.setIndexPriority('123');
      await actions.savePolicy();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/policies`,
        expect.objectContaining({
          body: JSON.stringify({
            name: 'my_policy',
            phases: {
              hot: {
                min_age: '0ms',
                actions: {
                  rollover: {
                    max_age: '30d',
                    max_primary_shard_size: '50gb',
                  },
                },
              },
              warm: {
                min_age: '11d',
                actions: {
                  set_priority: {
                    priority: 123,
                  },
                  shrink: {
                    number_of_shards: 123,
                  },
                  forcemerge: {
                    max_num_segments: 123,
                    index_codec: 'best_compression',
                  },
                  allocate: {
                    require: {
                      test: '123',
                    },
                    number_of_replicas: 123,
                  },
                  readonly: {},
                },
              },
            },
          }),
        })
      );
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
          testBed = await setupSerializationTestBed(httpSetup);
        });

        const { component } = testBed;
        component.update();
      });

      test('preserves include, exclude allocation settings', async () => {
        const { actions } = testBed;
        await actions.warm.setDataAllocation('node_attrs');
        await actions.warm.setSelectedNodeAttribute('test:123');
        await actions.savePolicy();

        const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
        const [requestUrl, requestBody] = lastReq;
        const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

        const warmPhaseAllocate = parsedReqBody.phases.warm.actions.allocate;

        expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
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
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();

      await act(async () => {
        testBed = await setupSerializationTestBed(httpSetup);
      });

      const { component } = testBed;
      component.update();
    });

    test('default values', async () => {
      const { actions } = testBed;

      await actions.togglePhase('cold');
      await actions.cold.setMinAgeValue('11');
      await actions.savePolicy();

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(parsedReqBody.phases.cold).toMatchInlineSnapshot(`
          Object {
            "actions": Object {
              "set_priority": Object {
                "priority": 0,
              },
            },
            "min_age": "11d",
          }
        `);
    });

    test('setting all values, excluding searchable snapshot', async () => {
      const { actions } = testBed;

      await actions.togglePhase('cold');
      await actions.cold.setMinAgeValue('123');
      await actions.cold.setMinAgeUnits('s');
      await actions.cold.setDataAllocation('node_attrs');
      await actions.cold.setSelectedNodeAttribute('test:123');
      await actions.cold.setReplicas('123');
      await actions.cold.toggleReadonly();
      await actions.cold.setIndexPriority('123');

      await actions.savePolicy();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/policies`,
        expect.objectContaining({
          body: JSON.stringify({
            name: 'my_policy',
            phases: {
              hot: {
                min_age: '0ms',
                actions: {
                  rollover: {
                    max_age: '30d',
                    max_primary_shard_size: '50gb',
                  },
                },
              },
              cold: {
                min_age: '123s',
                actions: {
                  set_priority: {
                    priority: 123,
                  },
                  allocate: {
                    require: {
                      test: '123',
                    },
                    number_of_replicas: 123,
                  },
                  readonly: {},
                },
              },
            },
          }),
        })
      );
    });

    // Setting searchable snapshot field disables setting replicas so we test this separately
    test('setting searchable snapshot', async () => {
      const { actions } = testBed;
      await actions.togglePhase('cold');
      await actions.cold.setMinAgeValue('10');
      await actions.cold.setSearchableSnapshot('my-repo');
      await actions.savePolicy();

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(parsedReqBody.phases.cold.actions.searchable_snapshot.snapshot_repository).toEqual(
        'my-repo'
      );
    });
  });

  describe('frozen phase', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setDefaultResponses();

      await act(async () => {
        testBed = await setupSerializationTestBed(httpSetup);
      });

      const { component } = testBed;
      component.update();
    });

    test('default value', async () => {
      const { actions } = testBed;
      await actions.togglePhase('frozen');
      await actions.frozen.setMinAgeValue('13');
      await actions.frozen.setSearchableSnapshot('myRepo');

      await actions.savePolicy();

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      console.log(requestUrl);
      console.log(requestBody);
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(parsedReqBody.phases.frozen).toEqual({
        min_age: '13d',
        actions: {
          searchable_snapshot: { snapshot_repository: 'myRepo' },
        },
      });
    });

    describe.skip('deserialization', () => {
      beforeEach(async () => {
        const policyToEdit = getDefaultHotPhasePolicy();
        policyToEdit.policy.phases.frozen = {
          min_age: '1234m',
          actions: { searchable_snapshot: { snapshot_repository: 'myRepo' } },
        };

        httpRequestsMockHelpers.setLoadPolicies([policyToEdit]);
        httpRequestsMockHelpers.setLoadSnapshotPolicies([]);
        httpRequestsMockHelpers.setListNodes({
          nodesByRoles: {},
          nodesByAttributes: { test: ['123'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        await act(async () => {
          testBed = await setupSerializationTestBed(httpSetup);
        });

        const { component } = testBed;
        component.update();
      });

      test('default value', async () => {
        const { actions } = testBed;

        await actions.savePolicy();

        const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
        const [requestUrl, requestBody] = lastReq;
        const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);


        console.log(parsedReqBody);

        expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
        expect(parsedReqBody.phases.frozen).toEqual({
          min_age: '1234m',
          actions: {
            searchable_snapshot: {
              snapshot_repository: 'myRepo',
            },
          },
        });
      });
    });
  });

  describe('delete phase', () => {
    test('default value', async () => {
      const { actions } = testBed;
      await actions.togglePhase('delete');
      await actions.delete.setSnapshotPolicy('test');
      await actions.savePolicy();

      const lastReq: HttpFetchOptionsWithPath[] = httpSetup.post.mock.calls.pop() || [];
      const [requestUrl, requestBody] = lastReq;
      const parsedReqBody = JSON.parse((requestBody as Record<string, any>).body);

      expect(requestUrl).toBe(`${API_BASE_PATH}/policies`);
      expect(parsedReqBody.phases.delete).toEqual({
        min_age: '365d',
        actions: {
          delete: {},
          wait_for_snapshot: {
            policy: 'test',
          },
        },
      });
    });
  });

  describe('shrink', () => {
    test('shrink shard size', async () => {
      const { actions } = testBed;
      await actions.hot.setShrinkSize('50');

      await actions.togglePhase('warm');
      await actions.warm.setMinAgeValue('11');
      await actions.warm.setShrinkSize('100');

      await actions.savePolicy();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/policies`,
        expect.objectContaining({
          body: JSON.stringify({
            name: 'my_policy',
            phases: {
              hot: {
                min_age: '0ms',
                actions: {
                  rollover: {
                    max_age: '30d',
                    max_primary_shard_size: '50gb',
                  },
                  shrink: {
                    max_primary_shard_size: '50gb',
                  },
                },
              },
              warm: {
                min_age: '11d',
                actions: {
                  set_priority: {
                    priority: 50,
                  },
                  shrink: {
                    max_primary_shard_size: '100gb',
                  },
                },
              },
            },
          }),
        })
      );
    });
  });
});
