/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setAutoFreeze } from 'immer';
import { cloneDeep } from 'lodash';
import { SerializedPolicy } from '../../../../../common/types';
import { defaultRolloverAction } from '../../../constants';
import { createDeserializer } from './deserializer';
import { createSerializer } from './serializer';
import { FormInternal } from '../types';

const isObject = (v: unknown): v is { [key: string]: any } =>
  Object.prototype.toString.call(v) === '[object Object]';

const unknownValue = { some: 'value' };

const deserializer = createDeserializer(false);

const populateWithUnknownEntries = (v: unknown) => {
  if (isObject(v)) {
    for (const key of Object.keys(v)) {
      if (['require', 'include', 'exclude'].includes(key)) continue; // this will generate an invalid policy
      populateWithUnknownEntries(v[key]);
    }
    v.unknown = unknownValue;
    return;
  }
  if (Array.isArray(v)) {
    v.forEach(populateWithUnknownEntries);
  }
};

const originalPolicy: SerializedPolicy = {
  name: 'test',
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '1d',
          max_primary_shard_size: '33gb',
          max_docs: 1000,
          max_size: '10gb',
        },
        forcemerge: {
          index_codec: 'best_compression',
          max_num_segments: 22,
        },
        readonly: {},
        set_priority: {
          priority: 1,
        },
      },
      min_age: '12ms',
    },
    warm: {
      min_age: '12ms',
      actions: {
        shrink: { number_of_shards: 12 },
        allocate: {
          number_of_replicas: 3,
          include: {
            some: 'value',
          },
          exclude: {
            some: 'value',
          },
        },
        readonly: {},
        set_priority: {
          priority: 10,
        },
        migrate: { enabled: true },
      },
    },
    cold: {
      min_age: '30ms',
      actions: {
        allocate: {
          number_of_replicas: 12,
          require: { test: 'my_value' },
          include: { test: 'my_value' },
          exclude: { test: 'my_value' },
        },
        readonly: {},
        set_priority: {
          priority: 12,
        },
        searchable_snapshot: {
          snapshot_repository: 'my repo!',
          force_merge_index: false,
        },
      },
    },
    delete: {
      min_age: '33ms',
      actions: {
        delete: {
          delete_searchable_snapshot: true,
        },
        wait_for_snapshot: {
          policy: 'test',
        },
      },
    },
  },
};

const originalMinimalPolicy: SerializedPolicy = {
  name: 'minimalPolicy',
  phases: {
    hot: { min_age: '0ms', actions: {} },
    warm: { min_age: '1d', actions: {} },
    cold: { min_age: '2d', actions: {} },
    delete: { min_age: '3d', actions: {} },
  },
};

describe('deserializer and serializer', () => {
  let policy: SerializedPolicy;
  let serializer: ReturnType<typeof createSerializer>;
  let formInternal: FormInternal;

  // So that we can modify produced form objects
  beforeAll(() => setAutoFreeze(false));
  // This is the default in dev, so change back to true (https://github.com/immerjs/immer/blob/master/docs/freezing.md)
  afterAll(() => setAutoFreeze(true));

  beforeEach(() => {
    policy = cloneDeep(originalPolicy);
    formInternal = deserializer(policy);
    // Because the policy object is not deepCloned by the form lib we
    // clone here so that we can mutate the policy and preserve the
    // original reference in the createSerializer
    serializer = createSerializer(cloneDeep(policy));
  });

  describe('unknown policy settings', function () {
    it('preserves any unknown properties', () => {
      const thisTestPolicy = cloneDeep(originalPolicy);
      // We populate all levels of the policy with entries our UI does not know about
      populateWithUnknownEntries(thisTestPolicy);
      serializer = createSerializer(thisTestPolicy);

      const copyOfThisTestPolicy = cloneDeep(thisTestPolicy);

      const _formInternal = deserializer(thisTestPolicy);
      expect(serializer(_formInternal)).toEqual(thisTestPolicy);

      // Assert that the policy we passed in is unaltered after deserialization and serialization
      expect(thisTestPolicy).not.toBe(copyOfThisTestPolicy);
      expect(thisTestPolicy).toEqual(copyOfThisTestPolicy);
    });

    it('except freeze action in the cold phase', () => {
      const policyWithoutFreeze = cloneDeep(originalPolicy);

      const policyWithFreeze = cloneDeep(policyWithoutFreeze);
      // add a freeze action to the cold phase
      policyWithFreeze.phases.cold!.actions!.freeze = {};
      serializer = createSerializer(policyWithFreeze);

      const _formInternal = deserializer(policyWithFreeze);
      expect(serializer(_formInternal)).toEqual(policyWithoutFreeze);
    });
  });

  it('removes all phases if they were disabled in the form', () => {
    formInternal._meta.warm.enabled = false;
    formInternal._meta.cold.enabled = false;
    formInternal._meta.delete.enabled = false;

    expect(serializer(formInternal)).toEqual({
      name: 'test',
      phases: {
        hot: policy.phases.hot, // We expect to see only the hot phase
      },
    });
  });

  it('removes the forcemerge action if it is disabled in the form', () => {
    delete formInternal.phases.hot!.actions.forcemerge;
    delete formInternal.phases.warm!.actions.forcemerge;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.forcemerge).toBeUndefined();
    expect(result.phases.warm!.actions.forcemerge).toBeUndefined();
  });

  it('removes the index_codec option in the forcemerge action if it is disabled in the form', () => {
    formInternal.phases.warm!.actions.forcemerge = {
      max_num_segments: 22,
      index_codec: 'best_compression',
    };
    formInternal._meta.hot.bestCompression = false;
    formInternal._meta.warm.bestCompression = false;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.forcemerge!.index_codec).toBeUndefined();
    expect(result.phases.warm!.actions.forcemerge!.index_codec).toBeUndefined();
  });

  it('removes the readonly action if it is disabled in hot', () => {
    formInternal._meta.hot.readonlyEnabled = false;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.readonly).toBeUndefined();
  });

  it('removes the readonly action if it is disabled in warm', () => {
    formInternal._meta.warm.readonlyEnabled = false;

    const result = serializer(formInternal);

    expect(result.phases.warm!.actions.readonly).toBeUndefined();
  });

  it('removes the readonly action if it is disabled in cold', () => {
    formInternal._meta.cold.readonlyEnabled = false;

    const result = serializer(formInternal);

    expect(result.phases.cold!.actions.readonly).toBeUndefined();
  });

  it('allows force merge and readonly actions to be configured in hot with default rollover enabled', () => {
    formInternal._meta.hot.isUsingDefaultRollover = true;
    formInternal._meta.hot.bestCompression = false;
    formInternal.phases.hot!.actions.forcemerge = undefined;
    formInternal._meta.hot.readonlyEnabled = false;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.readonly).toBeUndefined();
    expect(result.phases.hot!.actions.forcemerge).toBeUndefined();
  });

  it('removes set priority if it is disabled in the form', () => {
    delete formInternal.phases.hot!.actions.set_priority;
    delete formInternal.phases.warm!.actions.set_priority;
    delete formInternal.phases.cold!.actions.set_priority;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.set_priority).toBeUndefined();
    expect(result.phases.warm!.actions.set_priority).toBeUndefined();
    expect(result.phases.cold!.actions.set_priority).toBeUndefined();
  });

  it('removes node attribute allocation when it is not selected in the form', () => {
    // Change from 'node_attrs' to 'node_roles'
    formInternal._meta.cold.dataTierAllocationType = 'node_roles';

    const result = serializer(formInternal);

    expect(result.phases.cold!.actions.allocate!.number_of_replicas).toBe(12);
    expect(result.phases.cold!.actions.allocate!.require).toBeUndefined();
    expect(result.phases.cold!.actions.allocate!.include).toBeUndefined();
    expect(result.phases.cold!.actions.allocate!.exclude).toBeUndefined();
  });

  it('removes forcemerge, readonly, and rollover config when rollover is disabled in hot phase', () => {
    // These two toggles jointly control whether rollover is enabled since the default is
    // for rollover to be enabled.
    formInternal._meta.hot.isUsingDefaultRollover = false;
    formInternal._meta.hot.customRollover.enabled = false;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.rollover).toBeUndefined();
    expect(result.phases.hot!.actions.forcemerge).toBeUndefined();
    expect(result.phases.hot!.actions.readonly).toBeUndefined();
  });

  it('adds default rollover configuration when enabled, but previously not configured', () => {
    delete formInternal.phases.hot!.actions.rollover;
    formInternal._meta.hot.isUsingDefaultRollover = true;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.rollover).toEqual(defaultRolloverAction);
  });

  it('removes snapshot_repository when it is unset', () => {
    delete formInternal.phases.hot!.actions.searchable_snapshot;
    delete formInternal.phases.cold!.actions.searchable_snapshot;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.searchable_snapshot).toBeUndefined();
    expect(result.phases.cold!.actions.searchable_snapshot).toBeUndefined();
  });

  it('correctly serializes a minimal policy', () => {
    policy = cloneDeep(originalMinimalPolicy);
    const formInternalPolicy = cloneDeep(originalMinimalPolicy);
    serializer = createSerializer(policy);
    formInternal = deserializer(formInternalPolicy);

    // Simulate no action fields being configured in the UI. _Note_, we are not disabling these phases.
    // We are not setting any action field values in them so the action object will not be present.
    delete (formInternal.phases.hot as any).actions;
    delete (formInternal.phases.warm as any).actions;
    delete (formInternal.phases.cold as any).actions;
    delete (formInternal.phases.delete as any).actions;

    expect(serializer(formInternal)).toEqual({
      name: 'minimalPolicy',
      phases: {
        // Age is a required value for warm, cold and delete.
        hot: { min_age: '0ms', actions: {} },
        warm: { min_age: '1d', actions: {} },
        cold: { min_age: '2d', actions: {} },
        delete: { min_age: '3d', actions: { delete: {} } },
      },
    });
  });

  it('sets all known allocate options correctly', () => {
    formInternal.phases.warm!.actions.allocate!.number_of_replicas = 0;
    formInternal._meta.warm.dataTierAllocationType = 'node_attrs';
    formInternal._meta.warm.allocationNodeAttribute = 'some:value';

    expect(serializer(formInternal).phases.warm!.actions.allocate).toEqual({
      number_of_replicas: 0,
      require: {
        some: 'value',
      },
      include: {
        some: 'value',
      },
      exclude: {
        some: 'value',
      },
    });
  });

  it('sets allocate and migrate actions when defined together', () => {
    formInternal.phases.warm!.actions.allocate!.number_of_replicas = 0;
    formInternal._meta.warm.dataTierAllocationType = 'none';
    // This should not be set...
    formInternal._meta.warm.allocationNodeAttribute = 'some:value';

    const result = serializer(formInternal);

    expect(result.phases.warm!.actions.allocate).toEqual({
      number_of_replicas: 0,
    });

    expect(result.phases.warm!.actions.migrate).toEqual({
      enabled: false,
    });
  });

  it('removes shrink from hot and warm when unset', () => {
    delete formInternal.phases.hot!.actions!.shrink;
    delete formInternal.phases.warm!.actions!.shrink;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.shrink).toBeUndefined();
    expect(result.phases.warm!.actions.shrink).toBeUndefined();
  });

  it('removes rollover action fields', () => {
    formInternal.phases.hot!.actions.rollover!.max_size = '';
    formInternal.phases.hot!.actions.rollover!.max_age = '';
    formInternal.phases.hot!.actions.rollover!.max_docs = '' as any;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.rollover!.max_age).toBeUndefined();
    expect(result.phases.hot!.actions.rollover!.max_docs).toBeUndefined();
    expect(result.phases.hot!.actions.rollover!.max_size).toBeUndefined();
  });
});
