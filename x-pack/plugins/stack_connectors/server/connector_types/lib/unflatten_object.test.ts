/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenObject } from './unflatten_object';

describe('unflattenObject', () => {
  test('should unflatten an object', () => {
    const obj = {
      a: true,
      'b.baz[0].a': false,
      'b.baz[0].b': 'foo',
      'b.baz[1]': 'bar',
      'b.baz[2]': true,
      'b.foo': 'bar',
      'b.baz[3][0]': 1,
      'b.baz[3][1]': 2,
      'c.b.foo': 'cheese',
    };

    expect(unflattenObject(obj)).toEqual({
      a: true,
      b: {
        foo: 'bar',
        baz: [
          {
            a: false,
            b: 'foo',
          },
          'bar',
          true,
          [1, 2],
        ],
      },
      c: {
        b: {
          foo: 'cheese',
        },
      },
    });
  });
});
