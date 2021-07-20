/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFilterQueryCompatible } from './is_filter_query_compatible';

describe('is_filter_query_compatible', () => {
  test('returns true if given an undefined', () => {
    expect(isFilterQueryCompatible(undefined)).toEqual(true);
  });

  test('returns "true" if given a match all object', () => {
    expect(
      isFilterQueryCompatible({
        bool: {
          must: [],
          filter: [{ match_all: {} }],
          should: [],
          must_not: [],
        },
      })
    ).toEqual(true);
  });

  test('returns "false" if given a match all object with something inside of it such as match_none', () => {
    expect(
      isFilterQueryCompatible({
        bool: {
          must: [],
          filter: [{ match_none: {} }],
          should: [],
          must_not: [],
        },
      })
    ).toEqual(false);
  });

  test('returns "true" if given empty array for a filter', () => {
    expect(
      isFilterQueryCompatible({
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      })
    ).toEqual(true);
  });

  test('returns "true" if given match all object as a string', () => {
    expect(
      isFilterQueryCompatible(
        JSON.stringify({
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not: [],
          },
        })
      )
    ).toEqual(true);
  });

  test('returns "true" if given empty array for a filter as a string', () => {
    expect(
      isFilterQueryCompatible(
        JSON.stringify({
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not: [],
          },
        })
      )
    ).toEqual(true);
  });

  test('returns "false" if given an invalid string', () => {
    expect(isFilterQueryCompatible('invalid string')).toEqual(false);
  });
});
