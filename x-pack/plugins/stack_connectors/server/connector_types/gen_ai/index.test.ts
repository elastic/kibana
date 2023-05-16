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
import { OpenAiProviderType } from '@kbn/triggers-actions-ui-plugin/common';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import axios from 'axios';
import { ConnectorTypeConfigType, getConnectorType, GenerativeAiConnectorType } from '.';

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

let connectorType: GenerativeAiConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
});

describe('Generative AI Connector', () => {
  test('exposes the connector as `Generative AI` with id `.gen-ai`', () => {
    expect(connectorType.id).toEqual('.gen-ai');
    expect(connectorType.name).toEqual('Generative AI');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid', () => {
    const secrets: Record<string, string> = {
      apiKey: 'supersecret',
    };
    expect(validateSecrets(connectorType, secrets, { configurationUtilities })).toEqual(secrets);
  });

  test('fails when secret apiKey is omitted', () => {
    expect(() => {
      validateSecrets(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [apiKey]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('config validation', () => {
  test('config validation passes when only required fields are provided', () => {
    const config: Record<string, string | boolean> = {
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      apiProvider: OpenAiProviderType.OpenAi,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual(config);
  });

  test('config validation failed when a url is invalid', () => {
    const config: Record<string, string> = {
      apiUrl: 'example.com/do-something',
      apiProvider: OpenAiProviderType.OpenAi,
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      '"error validating action type config: error configuring Generative AI action: unable to parse apiUrl: TypeError: Invalid URL: example.com/do-something"'
    );
  });

  test('config validation failed when the OpenAI API provider is invalid', () => {
    const config: Record<string, string> = {
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      apiProvider: '',
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      '"error validating action type config: error configuring Generative AI action: invalid OpenAi Provider: Error: API Provider is not supported"'
    );
  });

  test('config validation passes when api url does not present in allowedHosts', () => {
    // any for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {
      apiUrl: 'http://mylisteningserver.com:9200/endpoint',
      apiProvider: OpenAiProviderType.OpenAi,
    };

    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual(config);
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
      apiUrl: 'http://mylisteningserver.com:9200/endpoint',
      apiProvider: OpenAiProviderType.OpenAi,
    };

    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities: configUtils });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring Generative AI action: target url is not present in allowedHosts"`
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
      body: '{}',
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

  test('execute with apiUrl/apiProvider sends request with basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      apiUrl: 'https://abc.def/my-gen-ai',
      apiProvider: OpenAiProviderType.OpenAi,
    };
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { apiKey: 'abc' },
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
          "Authorization": "Bearer abc",
          "content-type": "application/json",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "response from Generative AI action \\"some-id\\": [HTTP 200] ",
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
        "method": "POST",
        "url": "https://abc.def/my-gen-ai",
      }
    `);
  });

  test('execute with exception maxContentLength size exceeded should log the proper error', async () => {
    const config: ConnectorTypeConfigType = {
      apiUrl: 'https://abc.def/my-gen-ai',
      apiProvider: OpenAiProviderType.OpenAi,
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
      secrets: { apiKey: 'abc' },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
    });
    expect(mockedLogger.error).toBeCalledWith(
      'error on some-id Generative AI event: maxContentLength size of 1000000 exceeded'
    );
  });
});
