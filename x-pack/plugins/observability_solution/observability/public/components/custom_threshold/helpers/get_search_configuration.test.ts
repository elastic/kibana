/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultQuery, getSearchConfiguration } from './get_search_configuration';

describe('getSearchConfiguration()', () => {
  const onWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the same query if query has the correct type', () => {
    const query = {
      query: 'random query',
      language: 'random language',
    };

    expect(getSearchConfiguration({ query }, onWarning)).toEqual({ query });
    expect(onWarning).toHaveBeenCalledTimes(0);
  });

  it('should return undefined for query if query is undefined', () => {
    expect(getSearchConfiguration({}, onWarning)).toEqual({});
    expect(onWarning).toHaveBeenCalledTimes(0);
  });

  it('should return default query if type of query is not Query and calls onWarning', () => {
    const query = {
      esql: 'random esql',
    };

    expect(getSearchConfiguration({ query }, onWarning)).toEqual({ query: defaultQuery });
    expect(onWarning).toHaveBeenCalledTimes(1);
  });
});
