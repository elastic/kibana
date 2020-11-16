/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseSearchParams } from './parse_search_params';

describe('parseSearchParams', () => {
  it('returns the correct term', () => {
    const searchParams = parseSearchParams('tag:(my-tag OR other-tag) hello');
    expect(searchParams.term).toEqual('hello');
  });

  it('returns `undefined` term if query only contains field clauses', () => {
    const searchParams = parseSearchParams('tag:(my-tag OR other-tag)');
    expect(searchParams.term).toBeUndefined();
  });

  it('returns correct filters when no field clause is defined', () => {
    const searchParams = parseSearchParams('hello');
    expect(searchParams.filters).toEqual({
      tags: undefined,
      types: undefined,
      unknowns: {},
    });
  });

  // TODO: additional tests
});
