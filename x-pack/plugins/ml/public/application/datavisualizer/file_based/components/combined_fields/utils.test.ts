/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isWithinLatRange, isWithinLonRange } from './utils';

test('isWithinLatRange', () => {
  expect(isWithinLatRange('fieldAlpha', {})).toBe(false);
  expect(
    isWithinLatRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 1 }],
      },
    })
  ).toBe(false);
  expect(
    isWithinLatRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 100 }],
        max_value: 100,
        min_value: 0,
      },
    })
  ).toBe(false);
  expect(
    isWithinLatRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: -100 }],
        max_value: 0,
        min_value: -100,
      },
    })
  ).toBe(false);
  expect(
    isWithinLatRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 0 }],
        max_value: 0,
        min_value: 0,
      },
    })
  ).toBe(true);
});

test('isWithinLonRange', () => {
  expect(isWithinLonRange('fieldAlpha', {})).toBe(false);
  expect(
    isWithinLonRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 1 }],
      },
    })
  ).toBe(false);
  expect(
    isWithinLonRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 200 }],
        max_value: 200,
        min_value: 0,
      },
    })
  ).toBe(false);
  expect(
    isWithinLonRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: -200 }],
        max_value: 0,
        min_value: -200,
      },
    })
  ).toBe(false);
  expect(
    isWithinLonRange('fieldAlpha', {
      fieldAlpha: {
        count: 1,
        cardinality: 1,
        top_hits: [{ count: 1, value: 0 }],
        max_value: 0,
        min_value: 0,
      },
    })
  ).toBe(true);
});
