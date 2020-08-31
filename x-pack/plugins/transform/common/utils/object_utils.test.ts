/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNestedProperty } from './object_utils';

describe('object_utils', () => {
  test('getNestedProperty()', () => {
    const testObj = {
      the: {
        nested: {
          value: 'the-nested-value',
        },
      },
    };

    const falseyObj = {
      the: {
        nested: {
          value: false,
        },
        other_nested: {
          value: 0,
        },
      },
    };

    const test1 = getNestedProperty(testObj, 'the');
    expect(typeof test1).toBe('object');
    expect(Object.keys(test1)).toStrictEqual(['nested']);

    const test2 = getNestedProperty(testObj, 'the$');
    expect(typeof test2).toBe('undefined');

    const test3 = getNestedProperty(testObj, 'the$', 'the-default-value');
    expect(typeof test3).toBe('string');
    expect(test3).toBe('the-default-value');

    const test4 = getNestedProperty(testObj, 'the.neSted');
    expect(typeof test4).toBe('undefined');

    const test5 = getNestedProperty(testObj, 'the.nested');
    expect(typeof test5).toBe('object');
    expect(Object.keys(test5)).toStrictEqual(['value']);

    const test6 = getNestedProperty(testObj, 'the.nested.vaLue');
    expect(typeof test6).toBe('undefined');

    const test7 = getNestedProperty(testObj, 'the.nested.value');
    expect(typeof test7).toBe('string');
    expect(test7).toBe('the-nested-value');

    const test8 = getNestedProperty(testObj, 'the.nested.value.doesntExist');
    expect(typeof test8).toBe('undefined');

    const test9 = getNestedProperty(testObj, 'the.nested.value.doesntExist', 'the-default-value');
    expect(typeof test9).toBe('string');
    expect(test9).toBe('the-default-value');

    const test10 = getNestedProperty(falseyObj, 'the.nested.value');
    expect(typeof test10).toBe('boolean');
    expect(test10).toBe(false);

    const test11 = getNestedProperty(falseyObj, 'the.other_nested.value');
    expect(typeof test11).toBe('number');
    expect(test11).toBe(0);
  });
});
