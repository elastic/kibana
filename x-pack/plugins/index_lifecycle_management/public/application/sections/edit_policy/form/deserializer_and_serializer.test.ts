/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setAutoFreeze } from 'immer';
import { cloneDeep } from 'lodash';
import { SerializedPolicy } from '../../../../../common/types';
import { deserializer } from './deserializer';
import { createSerializer } from './serializer';
import { FormInternal } from '../types';

const isObject = (v: unknown): v is { [key: string]: any } =>
  Object.prototype.toString.call(v) === '[object Object]';

const unknownValue = { some: 'value' };

const populateWithUnknownEntries = (v: unknown) => {
  if (isObject(v)) {
    for (const key of Object.keys(v)) {
      if (key === 'require' || key === 'include' || key === 'exclude') continue; // this will generate an invalid policy
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
          max_size: '10gb',
          max_docs: 1000,
        },
        forcemerge: {
          index_codec: 'best_compression',
          max_num_segments: 22,
        },
        set_priority: {
          priority: 1,
        },
      },
      min_age: '12ms',
    },
    warm: {
      actions: {
        shrink: { number_of_shards: 12 },
        allocate: {
          number_of_replicas: 3,
        },
        set_priority: {
          priority: 10,
        },
        migrate: { enabled: false },
      },
    },
    cold: {
      actions: {
        allocate: {
          number_of_replicas: 12,
          require: { test: 'my_value' },
          include: { test: 'my_value' },
          exclude: { test: 'my_value' },
        },
        freeze: {},
        set_priority: {
          priority: 12,
        },
      },
    },
    delete: {
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
    serializer = createSerializer(policy);
    formInternal = deserializer(policy);
  });

  it('preserves any unknown policy settings', () => {
    // We populate all levels of the policy with entries our UI does not know about
    populateWithUnknownEntries(policy);

    const copyOfPolicy = cloneDeep(policy);

    expect(serializer(formInternal)).toEqual(policy);

    // Assert that the policy we passed in is unaltered after deserialization and serialization
    expect(policy).toEqual(copyOfPolicy);
  });

  it('removes all phases if they were disabled in the form', () => {
    formInternal._meta.warm.enabled = false;
    formInternal._meta.cold.enabled = false;
    formInternal._meta.delete.enabled = false;

    expect(serializer(formInternal)).toEqual({
      ...policy,
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

  it('removes set priority if it is disabled in the form', () => {
    delete formInternal.phases.hot!.actions.set_priority;
    delete formInternal.phases.warm!.actions.set_priority;
    delete formInternal.phases.cold!.actions.set_priority;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.set_priority).toBeUndefined();
    expect(result.phases.warm!.actions.set_priority).toBeUndefined();
    expect(result.phases.cold!.actions.set_priority).toBeUndefined();
  });

  it('removes freeze setting in the cold phase if it is disabled in the form', () => {
    formInternal._meta.cold.freezeEnabled = false;

    const result = serializer(formInternal);

    expect(result.phases.cold!.actions.freeze).toBeUndefined();
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

  it('removes forcemerge and rollover config when rollover is disabled in hot phase', () => {
    formInternal._meta.hot.useRollover = false;

    const result = serializer(formInternal);

    expect(result.phases.hot!.actions.rollover).toBeUndefined();
    expect(result.phases.hot!.actions.forcemerge).toBeUndefined();
  });
});
