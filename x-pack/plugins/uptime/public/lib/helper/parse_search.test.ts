/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getParsedParams } from './parse_search';

describe('getParsedParams', () => {
  it('parses the query operator out', () => {
    expect(getParsedParams('?val1=3&val2=5')).toEqual({
      val1: '3',
      val2: '5',
    });
  });

  it('returns empty object for no search value', () => {
    expect(getParsedParams('')).toEqual({});
  });

  it('also parses queries if there is no query operator', () => {
    expect(getParsedParams('val1=3&val2=5')).toEqual({
      val1: '3',
      val2: '5',
    });
  });
});
