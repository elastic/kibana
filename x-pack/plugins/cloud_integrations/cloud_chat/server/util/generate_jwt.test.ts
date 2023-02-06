/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('jsonwebtoken', () => ({
  sign: (payload: {}, secret: string, options: {}) => {
    return `${JSON.stringify(payload)}.${secret}.${JSON.stringify(options)}`;
  },
}));

import { generateSignedJwt } from './generate_jwt';

describe('generateSignedJwt', () => {
  test('creating a JWT token', () => {
    const jwtToken = generateSignedJwt('test', '123456');
    expect(jwtToken).toEqual(
      '{"sub":"test"}.123456.{"header":{"alg":"HS256","typ":"JWT"},"expiresIn":300}'
    );
  });
});
