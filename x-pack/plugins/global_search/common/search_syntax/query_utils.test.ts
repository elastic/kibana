/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from '@elastic/eui';
import { getSearchTerm, getFieldValueMap, applyAliases } from './query_utils';
import { FilterValues } from './types';

describe('getSearchTerm', () => {
  const searchTerm = (raw: string) => getSearchTerm(Query.parse(raw));

  it('returns the search term when no field is present', () => {
    expect(searchTerm('some plain query')).toEqual('some plain query');
  });

  it('remove leading and trailing spaces', () => {
    expect(searchTerm('  hello dolly  ')).toEqual('hello dolly');
  });

  it('remove duplicate whitespaces', () => {
    expect(searchTerm('  foo    bar  ')).toEqual('foo bar');
  });

  it('omits field terms', () => {
    expect(searchTerm('some tag:foo query type:dashboard')).toEqual('some query');
    expect(searchTerm('tag:foo another query type:(dashboard OR vis)')).toEqual('another query');
  });

  it('remove duplicate whitespaces when using field terms', () => {
    expect(searchTerm('  over  tag:foo  9000  ')).toEqual('over 9000');
  });
});

describe('getFieldValueMap', () => {
  const fieldValueMap = (raw: string) => getFieldValueMap(Query.parse(raw));

  it('parses single value field term', () => {
    const result = fieldValueMap('tag:foo');

    expect(result.size).toBe(1);
    expect(result.get('tag')).toEqual(['foo']);
  });

  it('parses multi-value field term', () => {
    const result = fieldValueMap('tag:(foo OR bar)');

    expect(result.size).toBe(1);
    expect(result.get('tag')).toEqual(['foo', 'bar']);
  });

  it('parses multiple single value field terms', () => {
    const result = fieldValueMap('tag:foo tag:bar');

    expect(result.size).toBe(1);
    expect(result.get('tag')).toEqual(['foo', 'bar']);
  });

  it('parses multiple mixed single/multi value field terms', () => {
    const result = fieldValueMap('tag:foo tag:(bar OR hello) tag:dolly');

    expect(result.size).toBe(1);
    expect(result.get('tag')).toEqual(['foo', 'bar', 'hello', 'dolly']);
  });

  it('parses distinct field terms', () => {
    const result = fieldValueMap('tag:foo type:dashboard tag:dolly type:(config OR map) foo:bar');

    expect(result.size).toBe(3);
    expect(result.get('tag')).toEqual(['foo', 'dolly']);
    expect(result.get('type')).toEqual(['dashboard', 'config', 'map']);
    expect(result.get('foo')).toEqual(['bar']);
  });

  it('ignore the search terms', () => {
    const result = fieldValueMap('tag:foo some type:dashboard query foo:bar');

    expect(result.size).toBe(3);
    expect(result.get('tag')).toEqual(['foo']);
    expect(result.get('type')).toEqual(['dashboard']);
    expect(result.get('foo')).toEqual(['bar']);
  });
});

describe('applyAliases', () => {
  const getValueMap = (entries: Record<string, FilterValues>) =>
    new Map([...Object.entries(entries)]);

  it('returns the map unchanged when no aliases are used', () => {
    const result = applyAliases(
      getValueMap({
        tag: ['tag-1', 'tag-2'],
        type: ['dashboard'],
      }),
      {}
    );

    expect(result.size).toEqual(2);
    expect(result.get('tag')).toEqual(['tag-1', 'tag-2']);
    expect(result.get('type')).toEqual(['dashboard']);
  });

  it('apply the aliases', () => {
    const result = applyAliases(
      getValueMap({
        tag: ['tag-1'],
        tags: ['tag-2', 'tag-3'],
        type: ['dashboard'],
      }),
      {
        tag: ['tags'],
      }
    );

    expect(result.size).toEqual(2);
    expect(result.get('tag')).toEqual(['tag-1', 'tag-2', 'tag-3']);
    expect(result.get('type')).toEqual(['dashboard']);
  });
});
