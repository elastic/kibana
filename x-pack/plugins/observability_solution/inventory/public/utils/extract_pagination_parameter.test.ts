/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractPaginationParameter } from './extract_pagination_parameter';

describe('extractPaginationParameter', () => {
  it('should return undefined on an undefined query param', () => {
    expect(extractPaginationParameter(undefined)).toBeUndefined();
  });
  it('should throw an error with invalid query param input', () => {
    expect(() => extractPaginationParameter('[]')).toThrowError('Invalid pagination object');
    expect(() => extractPaginationParameter('a,b')).toThrowError('Invalid pagination object');
  });
  it('should return a valid object from a valid param input', () => {
    expect(extractPaginationParameter('(host:0,service:1)')).toEqual({ host: 0, service: 1 });
  });
});
