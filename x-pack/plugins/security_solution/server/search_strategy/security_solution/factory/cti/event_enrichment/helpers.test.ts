/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildIndicatorShouldClauses } from './helpers';

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
        'threatintel.indicator.file.hash.md5': {
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
        { match: { 'threatintel.indicator.ip': { _name: 'source.ip', query: '127.0.0.1' } } },
        { match: { 'threatintel.indicator.url.full': { _name: 'url.full', query: 'elastic.co' } } },
      ])
    );
  });
});
