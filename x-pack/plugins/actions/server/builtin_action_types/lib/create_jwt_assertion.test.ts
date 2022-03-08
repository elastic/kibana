/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

import jwt from 'jsonwebtoken';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { createJWTAssertion } from './create_jwt_assertion';

const jwtSign = jwt.sign as jest.Mock;
const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('createJWTAssertion', () => {
  test('creating a JWT token from provided claims with default values', () => {
    jwtSign.mockReturnValueOnce('123456qwertyjwttoken');

    const assertion = createJWTAssertion(mockLogger, 'test', '123456', {
      audience: '1',
      issuer: 'someappid',
      subject: 'test@gmail.com',
    });

    expect(assertion).toMatchInlineSnapshot('"123456qwertyjwttoken"');
  });

  test('throw the exception and log the proper error if token was not get successfuly', () => {
    jwtSign.mockImplementationOnce(() => {
      throw new Error('{"message": "jwt wrong header", "name": "JsonWebTokenError"}');
    });
    const fn = () =>
      createJWTAssertion(mockLogger, 'test', '123456', {
        audience: '1',
        issuer: 'someappid',
        subject: 'test@gmail.com',
      });
    expect(fn).toThrowError();

    expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Unable to generate JWT token. Error: Error: {\\"message\\": \\"jwt wrong header\\", \\"name\\": \\"JsonWebTokenError\\"}",
      ]
    `);
  });
});
