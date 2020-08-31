/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toHttpError, throwHttpError } from './validation';

describe('toHttpError', () => {
  it('returns nothing if validation is valid', () => {
    expect(toHttpError({ valid: true, message: undefined })).toBeUndefined();
  });

  it('returns an HTTP error if validation is invalid', () => {
    const error = toHttpError({ valid: false, message: 'validation message' });
    expect(error?.statusCode).toEqual(403);
    expect(error?.message).toEqual('validation message');
  });
});

describe('throwHttpError', () => {
  it('does nothing if validation is valid', () => {
    expect(() => throwHttpError({ valid: true, message: undefined })).not.toThrowError();
  });

  it('throws an error if validation is invalid', () => {
    let error;
    try {
      throwHttpError({ valid: false, message: 'validation failed' });
    } catch (e) {
      error = e;
    }
    expect(error?.statusCode).toEqual(403);
    expect(error?.message).toEqual('validation failed');
  });
});
