/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, PhraseFilter } from '@kbn/es-query';
import { FilterIn, FilterOut, updateFiltersArray } from './filter';

describe('updateFiltersArray', () => {
  it('should add new filter', () => {
    const existingFilters: PhraseFilter[] = [];
    const key: string = 'key';
    const value: string = 'value';
    const filterType: boolean = FilterIn;

    const newFilters = updateFiltersArray(
      existingFilters,
      key,
      value,
      filterType
    ) as PhraseFilter[];
    expect(newFilters).toHaveLength(1);
    expect(newFilters[0].meta.key).toEqual(key);
    expect(newFilters[0].meta.params?.query).toEqual(value);
    expect(newFilters[0].meta.negate).toEqual(!filterType);
  });

  it(`should replace a filter with it's negation`, () => {
    const key: string = 'key';
    const value: string = 'value';
    const existingFilters: Filter[] = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key,
          params: { query: value },
        },
        query: { match_phrase: { [key]: value } },
      },
    ];
    const filterType: boolean = FilterOut;

    const newFilters = updateFiltersArray(
      existingFilters,
      key,
      value,
      filterType
    ) as PhraseFilter[];
    expect(newFilters).toHaveLength(1);
    expect(newFilters[0].meta.key).toEqual(key);
    expect(newFilters[0].meta.params?.query).toEqual(value);
    expect(newFilters[0].meta.negate).toEqual(!filterType);
  });

  it('should do nothing when filter already exists', () => {
    const key: string = 'key';
    const value: string = 'value';
    const existingFilters: Filter[] = [
      {
        meta: {
          alias: null,
          negate: true,
          disabled: false,
          type: 'phrase',
          key,
          params: { query: value },
        },
        query: { match_phrase: { [key]: value } },
      },
    ];
    const filterType: boolean = FilterIn;
    const newFilters = updateFiltersArray(
      existingFilters,
      key,
      value,
      filterType
    ) as PhraseFilter[];
    expect(newFilters).toHaveLength(1);
    expect(newFilters[0].meta.key).toEqual(key);
    expect(newFilters[0].meta.params?.query).toEqual(value);
    expect(newFilters[0].meta.negate).toEqual(!filterType);
  });
});
