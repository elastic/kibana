/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('queryString', () => ({
  ...(jest.requireActual('queryString') as object),
  parse: jest.fn(),
}));

import queryString from 'query-string';

import { parseQueryParams } from './';

describe('parseQueryParams', () => {
  it('should call queryString parse method', () => {
    const parseMock = jest.fn();
    jest.spyOn(queryString, 'parse').mockImplementation(parseMock);
    parseQueryParams('?foo=bar');

    expect(queryString.parse).toHaveBeenCalledWith('?foo=bar', { arrayFormat: 'bracket' });
  });
});
