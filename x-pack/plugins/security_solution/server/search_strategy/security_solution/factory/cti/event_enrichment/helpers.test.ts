/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIndicatorEnrichments, buildIndicatorShouldClauses, getTotalCount } from './helpers';

describe('buildIndicatorShouldClauses', () => {
  it('returns an empty array given an empty fieldset', () => {
    expect(buildIndicatorShouldClauses({})).toEqual([]);
  });

  it('returns an empty array given no relevant values', () => {
    const eventFields = { 'url.domain': 'elastic.co' };
    expect(buildIndicatorShouldClauses(eventFields)).toEqual([]);
  });

  it('returns a clause for each relevant value', () => {
    const eventFields = { 'source.ip': '127.0.0.1', 'url.full': 'elastic.co' };
    expect(buildIndicatorShouldClauses(eventFields)).toHaveLength(2);
  });

  it('excludes non-CTI fields', () => {
    const eventFields = { 'source.ip': '127.0.0.1', 'url.domain': 'elastic.co' };
    expect(buildIndicatorShouldClauses(eventFields)).toHaveLength(1);
  });

  it('defines a named query where the name is the event field and the value is the event field value', () => {
    const eventFields = { 'file.hash.md5': '1eee2bf3f56d8abed72da2bc523e7431' };

    expect(buildIndicatorShouldClauses(eventFields)).toContainEqual({
      match: {
        'threat.indicator.file.hash.md5': {
          _name: 'file.hash.md5',
          query: '1eee2bf3f56d8abed72da2bc523e7431',
        },
      },
    });
  });

  it('returns valid queries for multiple valid fields', () => {
    const eventFields = { 'source.ip': '127.0.0.1', 'url.full': 'elastic.co' };
    expect(buildIndicatorShouldClauses(eventFields)).toEqual(
      expect.arrayContaining([
        { match: { 'threat.indicator.ip': { _name: 'source.ip', query: '127.0.0.1' } } },
        { match: { 'threat.indicator.url.full': { _name: 'url.full', query: 'elastic.co' } } },
      ])
    );
  });
});

describe('getTotalCount', () => {
  it('returns 0 when total is null (not tracking)', () => {
    expect(getTotalCount(null)).toEqual(0);
  });

  it('returns 0 when total is undefined (not tracking)', () => {
    expect(getTotalCount(undefined)).toEqual(0);
  });

  it('returns total when total is a number', () => {
    expect(getTotalCount(5)).toEqual(5);
  });

  it('returns total.value when total is an object', () => {
    expect(getTotalCount({ value: 20, relation: 'eq' })).toEqual(20);
  });
});

describe('buildIndicatorEnrichments', () => {
  it('returns nothing if hits have no matched queries', () => {
    const hits = [{ _id: '_id', _index: '_index', matched_queries: [] }];
    expect(buildIndicatorEnrichments(hits)).toEqual([]);
  });

  it("returns nothing if hits' matched queries are not valid", () => {
    const hits = [{ _id: '_id', _index: '_index', matched_queries: ['invalid.field'] }];
    expect(buildIndicatorEnrichments(hits)).toEqual([]);
  });

  it('builds a single enrichment if the hit has a matched query', () => {
    const hits = [
      {
        _id: '_id',
        _index: '_index',
        matched_queries: ['file.hash.md5'],
        fields: {
          'threat.indicator.file.hash.md5': ['indicator_value'],
        },
      },
    ];

    expect(buildIndicatorEnrichments(hits)).toEqual([
      expect.objectContaining({
        'matched.atomic': ['indicator_value'],
        'matched.field': ['file.hash.md5'],
        'matched.id': ['_id'],
        'matched.index': ['_index'],
        'threat.indicator.file.hash.md5': ['indicator_value'],
      }),
    ]);
  });

  it('builds multiple enrichments if the hit has matched queries', () => {
    const hits = [
      {
        _id: '_id',
        _index: '_index',
        matched_queries: ['file.hash.md5', 'source.ip'],
        fields: {
          'threat.indicator.file.hash.md5': ['indicator_value'],
          'threat.indicator.ip': ['127.0.0.1'],
        },
      },
    ];

    expect(buildIndicatorEnrichments(hits)).toEqual([
      expect.objectContaining({
        'matched.atomic': ['indicator_value'],
        'matched.field': ['file.hash.md5'],
        'matched.id': ['_id'],
        'matched.index': ['_index'],
        'threat.indicator.file.hash.md5': ['indicator_value'],
        'threat.indicator.ip': ['127.0.0.1'],
      }),
      expect.objectContaining({
        'matched.atomic': ['127.0.0.1'],
        'matched.field': ['source.ip'],
        'matched.id': ['_id'],
        'matched.index': ['_index'],
        'threat.indicator.file.hash.md5': ['indicator_value'],
        'threat.indicator.ip': ['127.0.0.1'],
      }),
    ]);
  });

  it('builds an enrichment for each hit', () => {
    const hits = [
      {
        _id: '_id',
        _index: '_index',
        matched_queries: ['file.hash.md5'],
        fields: {
          'threat.indicator.file.hash.md5': ['indicator_value'],
        },
      },
      {
        _id: '_id2',
        _index: '_index2',
        matched_queries: ['source.ip'],
        fields: {
          'threat.indicator.ip': ['127.0.0.1'],
        },
      },
    ];

    expect(buildIndicatorEnrichments(hits)).toEqual([
      expect.objectContaining({
        'matched.atomic': ['indicator_value'],
        'matched.field': ['file.hash.md5'],
        'matched.id': ['_id'],
        'matched.index': ['_index'],
        'threat.indicator.file.hash.md5': ['indicator_value'],
      }),
      expect.objectContaining({
        'matched.atomic': ['127.0.0.1'],
        'matched.field': ['source.ip'],
        'matched.id': ['_id2'],
        'matched.index': ['_index2'],
        'threat.indicator.ip': ['127.0.0.1'],
      }),
    ]);
  });
});
