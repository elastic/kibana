/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern } from 'src/plugins/data/common';
import { existingFields, Field, buildFieldList } from './existing_fields';

describe('existingFields', () => {
  function field(opts: string | Partial<Field>): Field {
    const obj = typeof opts === 'object' ? opts : {};
    const name = (typeof opts === 'string' ? opts : opts.name) || 'test';

    return {
      name,
      isScript: false,
      isMeta: false,
      ...obj,
    };
  }

  function searchResults(fields: Record<string, unknown[]> = {}) {
    return { fields, _index: '_index', _id: '_id' };
  }

  it('should handle root level fields', () => {
    const result = existingFields(
      [searchResults({ foo: ['bar'] }), searchResults({ baz: [0] })],
      [field('foo'), field('bar'), field('baz')]
    );

    expect(result).toEqual(['foo', 'baz']);
  });

  it('should handle basic arrays, ignoring empty ones', () => {
    const result = existingFields(
      [searchResults({ stuff: ['heyo', 'there'], empty: [] })],
      [field('stuff'), field('empty')]
    );

    expect(result).toEqual(['stuff']);
  });

  it('should handle objects with dotted fields', () => {
    const result = existingFields(
      [searchResults({ 'geo.country_name': ['US'] })],
      [field('geo.country_name')]
    );

    expect(result).toEqual(['geo.country_name']);
  });

  it('supports scripted fields', () => {
    const result = existingFields(
      [searchResults({ bar: ['scriptvalue'] })],
      [field({ name: 'bar', isScript: true })]
    );

    expect(result).toEqual(['bar']);
  });

  it('supports runtime fields', () => {
    const result = existingFields(
      [searchResults({ runtime_foo: ['scriptvalue'] })],
      [
        field({
          name: 'runtime_foo',
          runtimeField: { type: 'long', script: { source: '2+2' } },
        }),
      ]
    );

    expect(result).toEqual(['runtime_foo']);
  });

  it('supports meta fields', () => {
    const result = existingFields(
      [
        {
          // @ts-expect-error _mymeta is not defined on estypes.SearchHit
          _mymeta: 'abc',
          ...searchResults({ bar: ['scriptvalue'] }),
        },
      ],
      [field({ name: '_mymeta', isMeta: true })]
    );

    expect(result).toEqual(['_mymeta']);
  });
});

describe('buildFieldList', () => {
  const indexPattern = {
    title: 'testpattern',
    type: 'type',
    typeMeta: 'typemeta',
    fields: [
      { name: 'foo', scripted: true, lang: 'painless', script: '2+2' },
      {
        name: 'runtime_foo',
        isMapped: false,
        runtimeField: { type: 'long', script: { source: '2+2' } },
      },
      { name: 'bar' },
      { name: '@bar' },
      { name: 'baz' },
      { name: '_mymeta' },
    ],
  };

  it('supports scripted fields', () => {
    const fields = buildFieldList(indexPattern as unknown as IndexPattern, []);
    expect(fields.find((f) => f.isScript)).toMatchObject({
      isScript: true,
      name: 'foo',
      lang: 'painless',
      script: '2+2',
    });
  });

  it('supports runtime fields', () => {
    const fields = buildFieldList(indexPattern as unknown as IndexPattern, []);
    expect(fields.find((f) => f.runtimeField)).toMatchObject({
      name: 'runtime_foo',
      runtimeField: { type: 'long', script: { source: '2+2' } },
    });
  });

  it('supports meta fields', () => {
    const fields = buildFieldList(indexPattern as unknown as IndexPattern, ['_mymeta']);
    expect(fields.find((f) => f.isMeta)).toMatchObject({
      isScript: false,
      isMeta: true,
      name: '_mymeta',
    });
  });
});
