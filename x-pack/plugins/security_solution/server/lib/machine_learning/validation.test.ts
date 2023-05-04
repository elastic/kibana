/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toAuthzError, throwAuthzError } from './validation';

describe('toAuthzError', () => {
  it('returns nothing if validation is valid', () => {
    expect(toAuthzError({ valid: true, message: undefined })).toBeUndefined();
  });

  it('returns an HTTP error if validation is invalid', () => {
    const error = toAuthzError({ valid: false, message: 'validation message' });
    expect(error?.statusCode).toEqual(403);
    expect(error?.message).toEqual('validation message');
  });
});

describe('throwAuthzError', () => {
  it('does nothing if validation is valid', () => {
    expect(() => throwAuthzError({ valid: true, message: undefined })).not.toThrowError();
  });

  it('throws an error if validation is invalid', () => {
    let error;
    try {
      throwAuthzError({ valid: false, message: 'validation failed' });
    } catch (e) {
      error = e;
    }
    expect(error?.statusCode).toEqual(403);
    expect(error?.message).toEqual('validation failed');
  });
});
