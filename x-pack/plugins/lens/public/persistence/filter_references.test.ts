/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from 'src/plugins/data/public';
import { extractFilterReferences, injectFilterReferences } from './filter_references';
import { FilterStateStore } from 'src/plugins/data/common';

describe('filter saved object references', () => {
  const filters: Filter[] = [
    {
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        alias: null,
        disabled: false,
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        key: 'geo.src',
        negate: true,
        params: { query: 'CN' },
        type: 'phrase',
      },
      query: { match_phrase: { 'geo.src': 'CN' } },
    },
    {
      $state: { store: FilterStateStore.APP_STATE },
      meta: {
        alias: null,
        disabled: false,
        index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        key: 'geoip.country_iso_code',
        negate: true,
        params: { query: 'US' },
        type: 'phrase',
      },
      query: { match_phrase: { 'geoip.country_iso_code': 'US' } },
    },
  ];

  it('should create two index-pattern references', () => {
    const { references } = extractFilterReferences(filters);
    expect(references).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "90943e30-9a47-11e8-b64d-95841ca0b247",
          "name": "filter-index-pattern-0",
          "type": "index-pattern",
        },
        Object {
          "id": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
          "name": "filter-index-pattern-1",
          "type": "index-pattern",
        },
      ]
    `);
  });

  it('should restore the same filter after extracting and injecting', () => {
    const { persistableFilters, references } = extractFilterReferences(filters);
    expect(injectFilterReferences(persistableFilters, references)).toEqual(filters);
  });

  it('should ignore other references', () => {
    const { persistableFilters, references } = extractFilterReferences(filters);
    expect(
      injectFilterReferences(persistableFilters, [
        { type: 'index-pattern', id: '1234', name: 'some other index pattern' },
        ...references,
      ])
    ).toEqual(filters);
  });

  it('should inject other ids if references change', () => {
    const { persistableFilters, references } = extractFilterReferences(filters);

    expect(
      injectFilterReferences(
        persistableFilters,
        references.map((reference, index) => ({ ...reference, id: `overwritten-id-${index}` }))
      )
    ).toEqual([
      {
        ...filters[0],
        meta: {
          ...filters[0].meta,
          index: 'overwritten-id-0',
        },
      },
      {
        ...filters[1],
        meta: {
          ...filters[1].meta,
          index: 'overwritten-id-1',
        },
      },
    ]);
  });
});
