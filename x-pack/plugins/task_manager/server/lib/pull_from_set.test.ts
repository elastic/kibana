/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pullFromSet } from './pull_from_set';

describe(`pullFromSet`, () => {
  test(`doesnt pull from an empty set`, () => {
    expect(pullFromSet(new Set(), 10)).toEqual([]);
  });

  test(`doesnt pull when there is no capacity`, () => {
    expect(pullFromSet(new Set([1, 2, 3]), 0)).toEqual([]);
  });

  test(`pulls as many values as there are in the set`, () => {
    expect(pullFromSet(new Set([1, 2, 3]), 3)).toEqual([1, 2, 3]);
  });

  test(`pulls as many values as there are in the set up to capacity`, () => {
    expect(pullFromSet(new Set([1, 2, 3]), 2)).toEqual([1, 2]);
  });

  test(`modifies the orginal set`, () => {
    const set = new Set([1, 2, 3]);
    expect(pullFromSet(set, 2)).toEqual([1, 2]);
    expect(set).toEqual(new Set([3]));
  });
});
