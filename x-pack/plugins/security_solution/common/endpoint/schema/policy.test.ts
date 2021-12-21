/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetEndpointPackagePolicyRequestSchema } from './policy';

describe('endpoint policy schema', () => {
  const query = GetEndpointPackagePolicyRequestSchema.query;
  it('should return correct query params when valid', () => {
    const queryParams = {
      page: 1,
      pageSize: 5,
      kuery: 'some kuery',
    };
    expect(query.validate(queryParams)).toEqual(queryParams);
  });
  it('should use the correct default values', () => {
    const expected = { page: 1, pageSize: 20 };
    expect(query.validate(undefined)).toEqual(expected);
    expect(query.validate({ page: undefined })).toEqual(expected);
    expect(query.validate({ pageSize: undefined })).toEqual(expected);
    expect(query.validate({ page: undefined, pageSize: undefined })).toEqual(expected);
  });
  it('should throw if page param is not a number', () => {
    expect(() => query.validate({ page: 'notanumber' })).toThrowError();
  });

  it('should throw if page param is less than 1', () => {
    expect(() => query.validate({ page: 0 })).toThrowError();
  });

  it('should throw if pageSize param is not a number', () => {
    expect(() => query.validate({ pageSize: 'notanumber' })).toThrowError();
  });

  it('should throw if pageSize param is less than 1', () => {
    expect(() => query.validate({ pageSize: 0 })).toThrowError();
  });
});
