/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventHit } from '@kbn/securitysolution-t-grid';
import { EventHit } from '../../../../../common/search_strategy';
import { buildObjectForFieldPath } from './build_object_for_field_path';

describe('buildObjectForFieldPath', () => {
  it('builds an object from a single non-nested field', () => {
    expect(buildObjectForFieldPath('@timestamp', eventHit)).toEqual({
      '@timestamp': ['2020-11-17T14:48:08.922Z'],
    });
  });

  it('builds an object with no fields response', () => {
    const { fields, ...fieldLessHit } = eventHit;
    // @ts-expect-error fieldLessHit is intentionally missing fields
    expect(buildObjectForFieldPath('@timestamp', fieldLessHit)).toEqual({
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

    expect(buildObjectForFieldPath('foo.barBaz', hit)).toEqual({
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
    expect(buildObjectForFieldPath('foo.bar', hit)).toEqual({
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
    expect(buildObjectForFieldPath('foo.bar.baz', nestedHit)).toEqual({
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
    expect(buildObjectForFieldPath('threat.enrichments.matched.atomic', eventHit)).toEqual({
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
        ],
      },
    });
  });

  it('preserves multiple values for a single leaf', () => {
    expect(buildObjectForFieldPath('threat.enrichments.matched.field', eventHit)).toEqual({
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
      expect(buildObjectForFieldPath('nested_1.foo.nested_2.bar.leaf', nestedHit)).toEqual({
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
      expect(buildObjectForFieldPath('nested_1.foo.nested_2.bar.leaf_2', nestedHit)).toEqual({
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
