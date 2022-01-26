/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateSignedJwt } from './generate_jwt';

describe('generateJWT', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern').setSystemTime(new Date('2022-01-01').getTime());
  });

  it('should generate a JWT', () => {
    const userId = 'user-id';
    const secret = 'secret';
    const token = generateSignedJwt(userId, secret);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3);
    expect(token).toEqual(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTU1MDB9.QDptR3Ygzjs5bcOzm57xqETqsX05YtydbiyfXrh_4h8'
    );
  });
});
