/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeDictionaries, mergeArrays } from './samples';

describe('merge', () => {
  test('merges two objects', () => {
    const target = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    };

    const source = {
      age: 35,
      address: {
        city: 'San Francisco',
        state: 'CA',
      },
      hobbies: ['reading', 'painting'],
    };

    const expected = {
      name: 'John',
      age: [30, 35],
      address: {
        street: '123 Main St',
        city: ['New York', 'San Francisco'],
        state: 'CA',
      },
      hobbies: ['reading', 'painting'],
    };

    const result = mergeDictionaries(target, source);

    expect(result).toEqual(expected);
  });

  test('handles empty values', () => {
    const target = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    };

    const source = {
      age: null,
      address: {},
      hobbies: [],
    };

    const expected = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    };

    const result = mergeDictionaries(target, source);

    expect(result).toEqual(expected);
  });

  test('truncates arrays', () => {
    const target = {
      hobbies: ['reading', 'painting'],
    };

    const source = {
      hobbies: ['swimming', 'cooking'],
    };

    const expected = {
      hobbies: ['cooking', 'painting', 'reading'],
    };

    const result = mergeDictionaries(target, source);

    expect(result).toEqual(expected);
  });

  test('merges nested arrays', () => {
    const target = {
      name: 'John',
      address: {
        street: '123 Main St',
        city: 'New York',
      },
      hobbies: ['reading', 'painting'],
    };

    const source = {
      address: {
        city: 'San Francisco',
        state: 'CA',
      },
      hobbies: ['swimming', 'cooking'],
    };

    const expected = {
      name: 'John',
      address: {
        street: '123 Main St',
        city: ['New York', 'San Francisco'],
        state: 'CA',
      },
      hobbies: ['cooking', 'painting', 'reading'],
    };

    const result = mergeDictionaries(target, source);

    expect(result).toEqual(expected);
  });
});

describe('mergeArrays', () => {
  test('combines and sorts two arrays', () => {
    const target = [1, 3, 5];
    const source = [2, 4, 6];
    const expected = [1, 2, 3];
    const result = mergeArrays(target, source);
    expect(result).toEqual(expected);
  });

  test('removes duplicates from arrays', () => {
    const target = [1, 2, 3];
    const source = [2, 3, 4];
    const expected = [1, 2, 3];
    const result = mergeArrays(target, source);
    expect(result).toEqual(expected);
  });

  test('truncates array to maxArrayLength elements', () => {
    const target = [1, 2, 3];
    const source = [4, 5, 6];
    const expected = [1, 2, 3];
    const result = mergeArrays(target, source);
    expect(result).toEqual(expected);
  });

  test('handles empty arrays', () => {
    const target = [];
    const source = [];
    const expected = [];
    const result = mergeArrays(target, source);
    expect(result).toEqual(expected);
  });

  test('handles arrays with different types', () => {
    const target = [1, 'two', true];
    const source = [false, 'three', 4];
    const expected = [1, 4, false];
    const result = mergeArrays(target, source);
    expect(result).toEqual(expected);
  });
});
