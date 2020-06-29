/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flattenObject } from './flatten_object';

describe('flatten_object', () => {
  test('it flattens an object', () => {
    const obj = {
      foo: {
        nested: {
          field: 1,
        },
      },
      bar: 3,
    };
    expect(flattenObject(obj)).toMatchSnapshot();
  });

  test('it flattens an object that contains an array in a field', () => {
    const obj = {
      foo: {
        nested: {
          field: [1, 2, 3],
        },
      },
      bar: 3,
    };
    expect(flattenObject(obj)).toMatchSnapshot();
  });
});
