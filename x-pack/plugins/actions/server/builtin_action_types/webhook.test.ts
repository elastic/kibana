/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('axios', () => ({
  request: jest.fn(),
}));

import { getActionType } from './webhook';
import { ActionType, Services } from '../types';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { configUtilsMock } from '../actions_config.mock';
import { createActionTypeRegistry } from './index.test';
import { Logger } from '../../../../../src/core/server';
import axios from 'axios';

const axiosRequestMock = axios.request as jest.Mock;

const ACTION_TYPE_ID = '.webhook';

const services: Services = {
  callCluster: async (path: string, opts: any) => {},
  savedObjectsClient: savedObjectsClientMock.create(),
};

let actionType: ActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
  mockedLogger = logger;
});

describe('actionType', () => {
  test('exposes the action as `webhook` on its Id and Name', () => {
    expect(actionType.id).toEqual('.webhook');
    expect(actionType.name).toEqual('Webhook');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid', () => {
    const secrets: Record<string, any> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('fails when secret user is provided, but password is omitted', () => {
    expect(() => {
      validateSecrets(actionType, { user: 'bob' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: both user and password must be specified"`
    );
  });

  test('succeeds when basic authentication credentials are omitted', () => {
    expect(() => {
      validateSecrets(actionType, {}).toEqual({});
    });
  });
});

describe('config validation', () => {
  const defaultValues: Record<string, any> = {
    headers: null,
    method: 'post',
  };

  test('config validation passes when only required fields are provided', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation passes when valid methods are provided', () => {
    ['post', 'put'].forEach(method => {
      const config: Record<string, any> = {
        url: 'http://mylisteningserver:9200/endpoint',
        method,
      };
      expect(validateConfig(actionType, config)).toEqual({
        ...defaultValues,
        ...config,
      });
    });
  });

  test('should validate and throw error when method on config is invalid', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      method: 'https',
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [method]: types that failed validation:
- [method.0]: expected value to equal [post] but got [https]
- [method.1]: expected value to equal [put] but got [https]"
`);
  });

  test('config validation passes when a url is specified', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation passes when valid headers are provided', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('should validate and throw error when headers on config is invalid', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: 'application/json',
    };
    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [headers]: types that failed validation:
- [headers.0]: could not parse record value from [application/json]
- [headers.1]: expected value to equal [null] but got [application/json]"
`);
  });

  test('config validation passes when kibana config whitelists the url', () => {
    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation returns an error if the specified URL isnt whitelisted', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...configUtilsMock,
        ensureWhitelistedUri: _ => {
          throw new Error(`target url is not whitelisted`);
        },
      },
    });

    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring webhook action: target url is not whitelisted"`
    );
  });
});

describe('params validation', () => {
  test('param validation passes when no fields are provided as none are required', () => {
    const params: Record<string, any> = {};
    expect(validateParams(actionType, params)).toEqual({});
  });

  test('params validation passes when a valid body is provided', () => {
    const params: Record<string, any> = {
      body: 'count: {{ctx.payload.hits.total}}',
    };
    expect(validateParams(actionType, params)).toEqual({
      ...params,
    });
  });
});

describe('execute()', () => {
  beforeAll(() => {
    axiosRequestMock.mockReset();
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: configUtilsMock,
    });
  });

  beforeEach(() => {
    axiosRequestMock.mockReset();
    axiosRequestMock.mockResolvedValue({
      status: 200,
      statusText: '',
      data: '',
      headers: [],
      config: {},
    });
  });

  test('execute with username/password sends request with basic auth', async () => {
    await actionType.executor({
      actionId: 'some-id',
      services,
      config: {
        url: 'https://abc.def/my-webhook',
        method: 'post',
        headers: {
          aheader: 'a value',
        },
      },
      secrets: { user: 'abc', password: '123' },
      params: { body: 'some data' },
    });

    expect(axiosRequestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
          Object {
            "auth": Object {
              "password": "123",
              "username": "abc",
            },
            "data": "some data",
            "headers": Object {
              "aheader": "a value",
            },
            "method": "post",
            "url": "https://abc.def/my-webhook",
          }
    `);
  });

  test('execute without username/password sends request without basic auth', async () => {
    await actionType.executor({
      actionId: 'some-id',
      services,
      config: {
        url: 'https://abc.def/my-webhook',
        method: 'post',
        headers: {
          aheader: 'a value',
        },
      },
      secrets: {},
      params: { body: 'some data' },
    });

    expect(axiosRequestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
          Object {
            "data": "some data",
            "headers": Object {
              "aheader": "a value",
            },
            "method": "post",
            "url": "https://abc.def/my-webhook",
          }
    `);
  });
});
