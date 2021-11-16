/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('jsonwebtoken', () => ({
  jwt: {
    sign: jest.fn(),
  },
}));
// eslint-disable-next-line import/no-extraneous-dependencies
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

    expect(assertion).toMatchInlineSnapshot('');
  });

  test('throw the exception and log the proper error if token was not get successfuly', async () => {
    jwtSign.mockReturnValueOnce({
      name: 'JsonWebTokenError',
      message: 'jwt wrong header',
    });

    await expect(
      createJWTAssertion(mockLogger, 'test', '123456', {
        audience: '1',
        issuer: 'someappid',
        subject: 'test@gmail.com',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"{\\"error\\":\\"invalid_scope\\",\\"error_description\\":\\"AADSTS70011: The provided value for the input parameter \'scope\' is not valid.\\"}"'
    );

    expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "error thrown getting the access token from https://test for clientID: 123456: {\\"error\\":\\"invalid_scope\\",\\"error_description\\":\\"AADSTS70011: The provided value for the input parameter \'scope\' is not valid.\\"}",
      ]
    `);
  });
});
