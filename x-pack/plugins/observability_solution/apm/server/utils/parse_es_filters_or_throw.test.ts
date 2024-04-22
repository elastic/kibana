/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseEsFiltersOrThrow } from './parse_es_filters_or_throw';

describe('parseEsFiltersOrThrow', () => {
  it('should parse must_not clause', () => {
    const filters = JSON.stringify({
      must_not: [{ term: { 'service.name': 'opbeans-node' } }],
    });
    expect(parseEsFiltersOrThrow(filters)).toEqual({
      should: [],
      must: [],
      must_not: [{ term: { 'service.name': 'opbeans-node' } }],
      filter: [],
    });
  });

  it('should parse filters clause', () => {
    const filters = JSON.stringify({
      filter: [{ term: { 'service.name': 'opbeans-node' } }],
    });
    expect(parseEsFiltersOrThrow(filters)).toEqual({
      should: [],
      must: [],
      filter: [{ term: { 'service.name': 'opbeans-node' } }],
      must_not: [],
    });
  });

  it('throws on invalid filters caluse', () => {
    const filters = JSON.stringify({
      filter: { term: { 'service.name': 'opbeans-node' } },
    });
    expect(() => parseEsFiltersOrThrow(filters)).toThrow(
      'Failed to parse filters: filter is not iterable'
    );
  });

  it('throws on invalid must_not caluse', () => {
    const filters = JSON.stringify({
      must_not: { term: { 'service.name': 'opbeans-node' } },
    });
    expect(() => parseEsFiltersOrThrow(filters)).toThrow(
      'Failed to parse filters: must_not is not iterable'
    );
  });

  it('does not support should or must clauses', () => {
    const filters = JSON.stringify({
      should: [{ term: { 'service.name': 'opbeans-node' } }],
      must: [{ term: { 'service.name': 'opbeans-node' } }],
    });
    expect(parseEsFiltersOrThrow(filters)).toEqual({
      must_not: [],
      filter: [],
      should: [],
      must: [],
    });
  });
});
