/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep, set } from 'lodash';
import { SerializedPolicy } from '../../../../../common/types';
import { deserializer } from './deserializer';
import { createSerializer } from './serializer';

describe('deserializer and serializer', () => {
  it('preserves unknown policy settings', () => {
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
          },
        },
        cold: {
          actions: {
            allocate: { number_of_replicas: 12 },
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

    /**
     * Next we insert unknown values at various places in the policy object
     * where we know they may occur.
     */
    [
      '',
      'phases.hot.actions',
      'phases.hot.actions.rollover',
      'phases.warm.actions',
      'phases.warm.actions.forcemerge',
      'phases.cold.actions',
      'phases.delete.actions',
    ].forEach((path) => {
      set(originalPolicy, path, { unknown: 'value' });
    });

    const copyOfOriginalPolicy = cloneDeep(originalPolicy);
    const formInternal = deserializer(copyOfOriginalPolicy);
    const serializer = createSerializer(copyOfOriginalPolicy);

    expect(serializer(formInternal)).toEqual(originalPolicy);

    // Assert that the original policy is unaltered after deserialization and serialization
    expect(originalPolicy).toEqual(copyOfOriginalPolicy);
  });
});
