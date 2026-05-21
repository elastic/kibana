/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoolQuery } from '@kbn/es-query';
import { extractEsQueryFilters } from './extract_es_query_filters';

describe('extractEsQueryFilters', () => {
  it('returns empty arrays when esQuery is undefined', () => {
    const result = extractEsQueryFilters(undefined);
    expect(result).toEqual({ filter: [], mustNot: [] });
  });

  it('returns empty arrays when bool clauses are empty', () => {
    const esQuery = { bool: {} as BoolQuery };
    const result = extractEsQueryFilters(esQuery);
    expect(result).toEqual({ filter: [], mustNot: [] });
  });

  it('normalizes filter when it is a single object', () => {
    const esQuery = {
      bool: {
        filter: { term: { 'service.name': 'opbeans-go' } },
      } as unknown as BoolQuery,
    };
    const result = extractEsQueryFilters(esQuery);
    expect(result.filter).toEqual([{ term: { 'service.name': 'opbeans-go' } }]);
    expect(result.mustNot).toEqual([]);
  });

  it('normalizes filter when it is an array', () => {
    const esQuery = {
      bool: {
        filter: [
          { term: { 'service.name': 'opbeans-go' } },
          { range: { '@timestamp': { gte: 'now-1h' } } },
        ],
      } as unknown as BoolQuery,
    };
    const result = extractEsQueryFilters(esQuery);
    expect(result.filter).toHaveLength(2);
    expect(result.filter[0]).toEqual({ term: { 'service.name': 'opbeans-go' } });
  });

  it('merges bool.must into filter', () => {
    const esQuery = {
      bool: {
        filter: [{ term: { 'service.name': 'opbeans-go' } }],
        must: { match: { 'transaction.name': 'GET /api' } },
      } as unknown as BoolQuery,
    };
    const result = extractEsQueryFilters(esQuery);
    expect(result.filter).toHaveLength(2);
    expect(result.filter[1]).toEqual({ match: { 'transaction.name': 'GET /api' } });
  });

  it('normalizes must_not when it is a single object', () => {
    const esQuery = {
      bool: {
        must_not: { term: { 'service.environment': 'test' } },
      } as unknown as BoolQuery,
    };
    const result = extractEsQueryFilters(esQuery);
    expect(result.filter).toEqual([]);
    expect(result.mustNot).toEqual([{ term: { 'service.environment': 'test' } }]);
  });

  it('normalizes must_not when it is an array', () => {
    const esQuery = {
      bool: {
        must_not: [
          { term: { 'service.environment': 'test' } },
          { term: { 'service.name': 'excluded' } },
        ],
      } as unknown as BoolQuery,
    };
    const result = extractEsQueryFilters(esQuery);
    expect(result.mustNot).toHaveLength(2);
  });

  it('handles all clauses together', () => {
    const esQuery = {
      bool: {
        filter: [{ term: { 'cloud.region': 'us-east-1' } }],
        must: [{ match_phrase: { 'transaction.type': 'request' } }],
        must_not: [{ term: { 'service.name': 'excluded' } }],
      } as unknown as BoolQuery,
    };
    const result = extractEsQueryFilters(esQuery);
    expect(result.filter).toHaveLength(2);
    expect(result.mustNot).toHaveLength(1);
  });
});
