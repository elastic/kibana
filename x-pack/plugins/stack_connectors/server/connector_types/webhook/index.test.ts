/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Services } from '@kbn/actions-plugin/server/types';
import { validateConfig, validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { Logger } from '@kbn/core/server';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import axios from 'axios';
import {
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  getConnectorType,
  WebhookConnectorType,
  WebhookMethods,
} from '.';

import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);
const requestMock = utils.request as jest.Mock;

axios.create = jest.fn(() => axios);

const services: Services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: WebhookConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
});

describe('connectorType', () => {
  test('exposes the connector as `webhook` on its Id and Name', () => {
    expect(connectorType.id).toEqual('.webhook');
    expect(connectorType.name).toEqual('Webhook');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid', () => {
    const secrets: Record<string, string> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(connectorType, secrets, { configurationUtilities })).toEqual(secrets);
  });

  test('fails when secret user is provided, but password is omitted', () => {
    expect(() => {
      validateSecrets(connectorType, { user: 'bob' }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: both user and password must be specified"`
    );
  });

  test('succeeds when basic authentication credentials are omitted', () => {
    expect(validateSecrets(connectorType, {}, { configurationUtilities })).toEqual({
      password: null,
      user: null,
    });
  });
});

describe('config validation', () => {
  const defaultValues: Record<string, string | null> = {
    headers: null,
    method: 'post',
  };

  test('config validation passes when only required fields are provided', () => {
    const config: Record<string, string | boolean> = {
      url: 'http://mylisteningserver:9200/endpoint',
      hasAuth: true,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation passes when valid methods are provided', () => {
    ['post', 'put'].forEach((method) => {
      const config: Record<string, string | boolean> = {
        url: 'http://mylisteningserver:9200/endpoint',
        method,
        hasAuth: true,
      };
      expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
        ...defaultValues,
        ...config,
      });
    });
  });

  test('should validate and throw error when method on config is invalid', () => {
    const config: Record<string, string> = {
      url: 'http://mylisteningserver:9200/endpoint',
      method: 'https',
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [method]: types that failed validation:
- [method.0]: expected value to equal [post]
- [method.1]: expected value to equal [put]"
`);
  });

  test('config validation passes when a url is specified', () => {
    const config: Record<string, string | boolean> = {
      url: 'http://mylisteningserver:9200/endpoint',
      hasAuth: true,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation failed when a url is invalid', () => {
    const config: Record<string, string> = {
      url: 'example.com/do-something',
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      '"error validating action type config: error configuring webhook action: unable to parse url: TypeError: Invalid URL: example.com/do-something"'
    );
  });

  test('config validation passes when valid headers are provided', () => {
    // any for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
      hasAuth: true,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('should validate and throw error when headers on config is invalid', () => {
    const config: Record<string, string> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: 'application/json',
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action type config: [headers]: types that failed validation:
- [headers.0]: could not parse record value from json input
- [headers.1]: expected value to equal [null]"
`);
  });

  test('config validation passes when kibana config url does not present in allowedHosts', () => {
    // any for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
      hasAuth: true,
    };

    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: (_: string) => {
        throw new Error(`target url is not present in allowedHosts`);
      },
    };

    // any for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities: configUtils });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring webhook action: target url is not present in allowedHosts"`
    );
  });
});

describe('params validation', () => {
  test('param validation passes when no fields are provided as none are required', () => {
    const params: Record<string, string> = {};
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({});
  });

  test('params validation passes when a valid body is provided', () => {
    const params: Record<string, string> = {
      body: 'count: {{ctx.payload.hits.total}}',
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({
      ...params,
    });
  });
});

describe('execute()', () => {
  beforeAll(() => {
    requestMock.mockReset();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      status: 200,
      statusText: '',
      data: '',
      headers: [],
      config: {},
    });
  });

  test('execute with username/password sends request with basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      hasAuth: true,
    };
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { user: 'abc', password: '123' },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "auth": Object {
          "password": "123",
          "username": "abc",
        },
        "axios": undefined,
        "data": "some data",
        "headers": Object {
          "aheader": "a value",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "response from webhook action \\"some-id\\": [HTTP 200] ",
              ],
            ],
            "results": Array [
              Object {
                "type": "return",
                "value": undefined,
              },
            ],
          },
          "error": [MockFunction],
          "fatal": [MockFunction],
          "get": [MockFunction],
          "info": [MockFunction],
          "isLevelEnabled": [MockFunction],
          "log": [MockFunction],
          "trace": [MockFunction],
          "warn": [MockFunction],
        },
        "method": "post",
        "url": "https://abc.def/my-webhook",
      }
    `);
  });

  test('execute with exception maxContentLength size exceeded should log the proper error', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      hasAuth: true,
    };
    requestMock.mockReset();
    requestMock.mockRejectedValueOnce({
      tag: 'err',
      isAxiosError: true,
      message: 'maxContentLength size of 1000000 exceeded',
    });
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { user: 'abc', password: '123' },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
    });
    expect(mockedLogger.error).toBeCalledWith(
      'error on some-id webhook event: maxContentLength size of 1000000 exceeded'
    );
  });

  test('execute without username/password sends request without basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      hasAuth: false,
    };
    const secrets: ConnectorTypeSecretsType = { user: null, password: null };
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets,
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": undefined,
        "data": "some data",
        "headers": Object {
          "aheader": "a value",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "response from webhook action \\"some-id\\": [HTTP 200] ",
              ],
            ],
            "results": Array [
              Object {
                "type": "return",
                "value": undefined,
              },
            ],
          },
          "error": [MockFunction],
          "fatal": [MockFunction],
          "get": [MockFunction],
          "info": [MockFunction],
          "isLevelEnabled": [MockFunction],
          "log": [MockFunction],
          "trace": [MockFunction],
          "warn": [MockFunction],
        },
        "method": "post",
        "url": "https://abc.def/my-webhook",
      }
    `);
  });

  test('renders parameter templates as expected', async () => {
    const rogue = `double-quote:"; line-break->\n`;

    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      body: '{"x": "{{rogue}}"}',
    };
    const variables = {
      rogue,
    };
    const params = connectorType.renderParameterTemplates!(paramsWithTemplates, variables);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let paramsObject: any;
    try {
      paramsObject = JSON.parse(`${params.body}`);
    } catch (err) {
      expect(err).toBe(null); // kinda weird, but test should fail if it can't parse
    }

    expect(paramsObject.x).toBe(rogue);
    expect(params.body).toBe(`{"x": "double-quote:\\"; line-break->\\n"}`);
  });
});
