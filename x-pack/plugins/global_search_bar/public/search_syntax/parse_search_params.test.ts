/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSearchParams } from './parse_search_params';

describe('parseSearchParams', () => {
  it('returns the correct term', () => {
    const searchParams = parseSearchParams('tag:(my-tag OR other-tag) hello');
    expect(searchParams.term).toEqual('hello');
  });

  it('returns the raw query as `term` in case of parsing error', () => {
    const searchParams = parseSearchParams('tag:((()^invalid');
    expect(searchParams).toEqual({
      term: 'tag:((()^invalid',
      filters: {},
    });
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
    });
  });

  it('returns correct filters when field clauses are present', () => {
    const searchParams = parseSearchParams('tag:foo type:bar hello tag:dolly');
    expect(searchParams).toEqual({
      term: 'hello',
      filters: {
        tags: ['foo', 'dolly'],
        types: ['bar'],
      },
    });
  });

  it('considers unknown field clauses to be part of the raw search term', () => {
    const searchParams = parseSearchParams('tag:foo unknown:bar hello');
    expect(searchParams).toEqual({
      term: 'unknown:bar hello',
      filters: {
        tags: ['foo'],
      },
    });
  });

  it('handles aliases field clauses', () => {
    const searchParams = parseSearchParams('tag:foo tags:bar type:dash types:board hello');
    expect(searchParams).toEqual({
      term: 'hello',
      filters: {
        tags: ['foo', 'bar'],
        types: ['dash', 'board'],
      },
    });
  });

  it('converts boolean and number values to string for known filters', () => {
    const searchParams = parseSearchParams('tag:42 tags:true type:69 types:false hello');
    expect(searchParams).toEqual({
      term: 'hello',
      filters: {
        tags: ['42', 'true'],
        types: ['69', 'false'],
      },
    });
  });
});
