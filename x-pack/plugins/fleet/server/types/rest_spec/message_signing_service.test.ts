/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errorMessage, RotateKeyPairSchema } from './message_signing_service';

describe('RotateKeyPairSchema', () => {
  it('should throw on `false` values for acknowledge', () => {
    expect(() =>
      RotateKeyPairSchema.query.validate({
        acknowledge: false,
      })
    ).toThrowError(errorMessage);
  });

  it('should allow without any query', () => {
    expect(() => RotateKeyPairSchema.query.validate({})).toThrowError(errorMessage);
  });

  it.each([1, 'string'])('should not allow non-boolean `%s` values for acknowledge', (value) => {
    expect(() =>
      RotateKeyPairSchema.query.validate({
        acknowledge: value,
      })
    ).toThrowError(`[acknowledge]: expected value of type [boolean] but got [${typeof value}]`);
  });

  it('should not throw on `true` values for acknowledge', () => {
    expect(() =>
      RotateKeyPairSchema.query.validate({
        acknowledge: true,
      })
    ).not.toThrow();
  });
});
