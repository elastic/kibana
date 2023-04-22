/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RotateKeyPairSchema } from './message_signing_service';

describe('RotateKeyPairSchema', () => {
  it('should allow without any query', () => {
    expect(() => RotateKeyPairSchema.query.validate({})).not.toThrow();
  });

  it('should not allow non boolean values for acknowledge', () => {
    expect(() =>
      RotateKeyPairSchema.query.validate({
        acknowledge: 1,
      })
    ).toThrowError('[acknowledge]: expected value of type [boolean] but got [number]');
  });
});
