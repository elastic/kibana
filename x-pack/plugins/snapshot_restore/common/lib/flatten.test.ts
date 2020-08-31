/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { flatten } from './flatten';

describe('flatten()', () => {
  it('should return an empty object', () => {
    expect(flatten({})).toEqual({});
  });

  it('should flatten a nested object', () => {
    expect(
      flatten({
        foo: 'bar',
        nested: {
          test: 'value',
          list: [{ fruit: 'apple' }, { fruit: 'banana' }],
        },
        'with.dot': 123,
      })
    ).toEqual({
      foo: 'bar',
      'nested.test': 'value',
      'nested.list.0.fruit': 'apple',
      'nested.list.1.fruit': 'banana',
      'with.dot': 123,
    });
  });
});
