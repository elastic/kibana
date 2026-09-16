/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toKeywordFilter } from './keyword_filter';

describe('toKeywordFilter', () => {
  it('ORs the content words of a question', () => {
    expect(toKeywordFilter('connection failures')).toBe('message: connection or message: failures');
  });

  it('drops stop words so the filter carries only retrieval signal', () => {
    expect(toKeywordFilter('a service cannot reach one of its dependencies')).toBe(
      'message: service or message: reach or message: dependencies'
    );
  });

  it('keeps a single literal term intact', () => {
    expect(toKeywordFilter('ECONNREFUSED')).toBe('message: econnrefused');
  });

  it('returns undefined when nothing is left to search for', () => {
    expect(toKeywordFilter('is it the one')).toBeUndefined();
  });
});
