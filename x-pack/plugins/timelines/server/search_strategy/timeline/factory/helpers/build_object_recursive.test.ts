/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventHit } from '@kbn/securitysolution-t-grid';
import { EventHit } from '../../../../../common/search_strategy';
import { buildObjectRecursive } from './build_object_recursive';

describe('buildObjectRecursive', () => {
  it('builds an object from a single non-nested field', () => {
    expect(buildObjectRecursive('@timestamp', eventHit.fields)).toEqual({
      '@timestamp': ['2020-11-17T14:48:08.922Z'],
    });
  });

  it('builds an object with no fields response', () => {
    const { fields, ...fieldLessHit } = eventHit;
    // @ts-expect-error fieldLessHit is intentionally missing fields
    expect(buildObjectRecursive('@timestamp', fieldLessHit)).toEqual({
      '@timestamp': [],
    });
  });

  it('does not misinterpret non-nested fields with a common prefix', () => {
    // @ts-expect-error hit is minimal
    const hit: EventHit = {
      fields: {
        'foo.bar': ['baz'],
        'foo.barBaz': ['foo'],
      },
    };

    expect(buildObjectRecursive('foo.barBaz', hit.fields)).toEqual({
      foo: { barBaz: ['foo'] },
    });
  });

  it('builds an array of objects from a nested field', () => {
    // @ts-expect-error hit is minimal
    const hit: EventHit = {
      fields: {
        foo: [{ bar: ['baz'] }],
      },
    };
    expect(buildObjectRecursive('foo.bar', hit.fields)).toEqual({
      foo: [{ bar: ['baz'] }],
    });
  });

  it('builds intermediate objects for nested fields', () => {
    // @ts-expect-error nestedHit is minimal
    const nestedHit: EventHit = {
      fields: {
        'foo.bar': [
          {
            baz: ['host.name'],
          },
        ],
      },
    };
    expect(buildObjectRecursive('foo.bar.baz', nestedHit.fields)).toEqual({
      foo: {
        bar: [
          {
            baz: ['host.name'],
          },
        ],
      },
    });
  });

  it('builds intermediate objects at multiple levels', () => {
    expect(buildObjectRecursive('threat.enrichments.matched.atomic', eventHit.fields)).toEqual({
      threat: {
        enrichments: [
          {
            matched: {
              atomic: ['matched_atomic'],
            },
          },
          {
            matched: {
              atomic: ['matched_atomic_2'],
            },
          },
          {
            matched: {
              atomic: ['MacBook-Pro-de-Gloria.local'],
            },
          },
          {
            matched: {
              atomic: ['MacBook-Pro-de-Gloria.local'],
            },
          },
          {
            matched: {
              atomic: ['x86_64'],
            },
          },
          {
            matched: {
              atomic: ['MacBook-Pro-de-Gloria.local'],
            },
          },
          {
            matched: {
              atomic: ['MacBook-Pro-de-Gloria.local'],
            },
          },
        ],
      },
    });
  });

  it('preserves multiple values for a single leaf', () => {
    expect(buildObjectRecursive('threat.enrichments.matched.field', eventHit.fields)).toEqual({
      threat: {
        enrichments: [
          {
            matched: {
              field: ['matched_field', 'other_matched_field'],
            },
          },
          {
            matched: {
              field: ['matched_field_2'],
            },
          },
          {
            matched: {
              field: ['host.name'],
            },
          },
          {
            matched: {
              field: ['host.hostname'],
            },
          },
          {
            matched: {
              field: ['host.architecture'],
            },
          },
          {
            matched: {
              field: ['host.name'],
            },
          },
          {
            matched: {
              field: ['host.hostname'],
            },
          },
        ],
      },
    });
  });

  describe('multiple levels of nested fields', () => {
    let nestedHit: EventHit;

    beforeEach(() => {
      // @ts-expect-error nestedHit is minimal
      nestedHit = {
        fields: {
          'nested_1.foo': [
            {
              'nested_2.bar': [
                { leaf: ['leaf_value'], leaf_2: ['leaf_2_value'] },
                { leaf_2: ['leaf_2_value_2', 'leaf_2_value_3'] },
              ],
            },
            {
              'nested_2.bar': [
                { leaf: ['leaf_value_2'], leaf_2: ['leaf_2_value_4'] },
                { leaf: ['leaf_value_3'], leaf_2: ['leaf_2_value_5'] },
              ],
            },
          ],
        },
      };
    });

    it('includes objects without the field', () => {
      expect(buildObjectRecursive('nested_1.foo.nested_2.bar.leaf', nestedHit.fields)).toEqual({
        nested_1: {
          foo: [
            {
              nested_2: {
                bar: [{ leaf: ['leaf_value'] }, { leaf: [] }],
              },
            },
            {
              nested_2: {
                bar: [{ leaf: ['leaf_value_2'] }, { leaf: ['leaf_value_3'] }],
              },
            },
          ],
        },
      });
    });

    it('groups multiple leaf values', () => {
      expect(buildObjectRecursive('nested_1.foo.nested_2.bar.leaf_2', nestedHit.fields)).toEqual({
        nested_1: {
          foo: [
            {
              nested_2: {
                bar: [
                  { leaf_2: ['leaf_2_value'] },
                  { leaf_2: ['leaf_2_value_2', 'leaf_2_value_3'] },
                ],
              },
            },
            {
              nested_2: {
                bar: [{ leaf_2: ['leaf_2_value_4'] }, { leaf_2: ['leaf_2_value_5'] }],
              },
            },
          ],
        },
      });
    });
  });
});
