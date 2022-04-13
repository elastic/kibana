/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios', () => ({
  create: jest.fn(),
}));
import axios from 'axios';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { requestOAuthJWTToken } from './request_oauth_jwt_token';

const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = jest.fn();

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('requestOAuthJWTToken', () => {
  beforeEach(() => {
    createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
  });

  test('making a token request with the required options', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        tokenType: 'Bearer',
        accessToken: 'dfjsdfgdjhfgsjdf',
        expiresIn: 123,
      },
    });
    await requestOAuthJWTToken(
      'https://test',
      {
        assertion: 'someJWTvalueishere',
        clientId: 'client-id-1',
        clientSecret: 'some-client-secret',
        scope: 'test',
      },
      mockLogger,
      configurationUtilities
    );

    expect(axiosInstanceMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test",
        Object {
          "data": "assertion=someJWTvalueishere&client_id=client-id-1&client_secret=some-client-secret&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&scope=test",
          "headers": Object {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          "httpAgent": undefined,
          "httpsAgent": Agent {
            "_events": Object {
              "free": [Function],
              "newListener": [Function],
            },
            "_eventsCount": 2,
            "_maxListeners": undefined,
            "_sessionCache": Object {
              "list": Array [],
              "map": Object {},
            },
            "defaultPort": 443,
            "freeSockets": Object {},
            "keepAlive": false,
            "keepAliveMsecs": 1000,
            "maxCachedSessions": 100,
            "maxFreeSockets": 256,
            "maxSockets": Infinity,
            "maxTotalSockets": Infinity,
            "options": Object {
              "path": null,
              "rejectUnauthorized": true,
            },
            "protocol": "https:",
            "requests": Object {},
            "scheduling": "lifo",
            "sockets": Object {},
            "totalSocketCount": 0,
            Symbol(kCapture): false,
          },
          "maxContentLength": 1000000,
          "method": "post",
          "proxy": false,
          "timeout": 360000,
          "validateStatus": [Function],
        },
      ]
    `);
  });

  test('throw the exception and log the proper error if token was not get successfuly', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 400,
      data: {
        error: 'invalid_scope',
        error_description:
          "AADSTS70011: The provided value for the input parameter 'scope' is not valid.",
      },
    });

    await expect(
      requestOAuthJWTToken(
        'https://test',
        {
          assertion: 'someJWTvalueishere',
          clientId: 'client-id-1',
          clientSecret: 'some-client-secret',
          scope: 'test',
        },
        mockLogger,
        configurationUtilities
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"{\\"error\\":\\"invalid_scope\\",\\"error_description\\":\\"AADSTS70011: The provided value for the input parameter \'scope\' is not valid.\\"}"'
    );

    expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "error thrown getting the access token from https://test for params: {\\"assertion\\":\\"someJWTvalueishere\\",\\"scope\\":\\"test\\",\\"client_id\\":\\"client-id-1\\",\\"client_secret\\":\\"some-client-secret\\"}: {\\"error\\":\\"invalid_scope\\",\\"error_description\\":\\"AADSTS70011: The provided value for the input parameter 'scope' is not valid.\\"}",
      ]
    `);
  });
});
