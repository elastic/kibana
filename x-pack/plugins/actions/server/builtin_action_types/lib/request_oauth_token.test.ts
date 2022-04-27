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
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { requestOAuthToken } from './request_oauth_token';
import { actionsConfigMock } from '../../actions_config.mock';

const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = jest.fn();

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

interface TestOAuthRequestParams {
  someAdditionalParam?: string;
  clientId?: string;
  clientSecret?: string;
}

describe('requestOAuthToken', () => {
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

    await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'test',
      configurationUtilities,
      mockLogger,
      {
        client_id: '123456',
        client_secret: 'secrert123',
        some_additional_param: 'test',
      }
    );

    expect(axiosInstanceMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test",
        Object {
          "data": "client_id=123456&client_secret=secrert123&grant_type=test&some_additional_param=test",
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
      requestOAuthToken<TestOAuthRequestParams>(
        'https://test',
        'test',
        configurationUtilities,
        mockLogger,
        {
          client_id: '123456',
          client_secret: 'secrert123',
          some_additional_param: 'test',
        }
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"{\\"error\\":\\"invalid_scope\\",\\"error_description\\":\\"AADSTS70011: The provided value for the input parameter \'scope\' is not valid.\\"}"'
    );

    expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "error thrown getting the access token from https://test for params: {\\"client_id\\":\\"123456\\",\\"client_secret\\":\\"secrert123\\",\\"some_additional_param\\":\\"test\\"}: {\\"error\\":\\"invalid_scope\\",\\"error_description\\":\\"AADSTS70011: The provided value for the input parameter 'scope' is not valid.\\"}",
      ]
    `);
  });
});
