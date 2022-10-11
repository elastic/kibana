/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Services } from '../types';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { actionsConfigMock } from '../actions_config.mock';
import { createActionTypeRegistry } from './index.test';
import { Logger } from '@kbn/core/server';
import { actionsMock } from '../mocks';
import axios from 'axios';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ActionTypeSecretsType,
  getActionType,
  TorqActionType,
} from './torq';

import * as utils from './lib/axios_utils';

const ACTION_TYPE_ID = '.torq';

jest.mock('axios');
jest.mock('./lib/axios_utils', () => {
  const originalUtils = jest.requireActual('./lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

const requestMock = utils.request as jest.Mock;

axios.create = jest.fn(() => axios);

const services: Services = actionsMock.createServices();

let actionType: TorqActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<
    ActionTypeConfigType,
    ActionTypeSecretsType,
    ActionParamsType
  >(ACTION_TYPE_ID);
  mockedLogger = logger;
});

describe('actionType', () => {
  test('exposes the action as `torq` on its Id and Name', () => {
    expect(actionType.id).toEqual('.torq');
    expect(actionType.name).toEqual('Torq');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid', () => {
    const secrets: Record<string, string> = {
      token: 'jfi2fji3ofeaiw34if',
    };
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('fails when secret token is not provided', () => {
    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: token is required"`
    );
  });
});

describe('config validation', () => {
  const defaultValues: Record<string, string | null> = {};

  test('config validation passes with an appropriate endpoint', () => {
    const config: Record<string, string | boolean> = {
      webhookIntegrationUrl: 'https://hooks.torq.io/v1/test',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  const errorCases: Array<{ name: string; url: string; errorMsg: string }> = [
    {
      name: 'invalid URL leads to error',
      url: 'iamnotavalidurl',
      errorMsg: `"error validating action type config: error configuring send to Torq action: unable to parse url: TypeError: Invalid URL: iamnotavalidurl"`,
    },
    {
      name: 'incomplete URL leads to error',
      url: 'example.com/do-something',
      errorMsg: `"error validating action type config: error configuring send to Torq action: unable to parse url: TypeError: Invalid URL: example.com/do-something"`,
    },
    {
      name: 'fails when URL is not a Torq webhook endpoint',
      url: 'http://mylisteningserver:9200/endpoint',
      errorMsg: `"error validating action type config: error configuring send to Torq action: url must begin with https://hooks.torq.io"`,
    },
  ];
  errorCases.forEach(({ name, url, errorMsg }) => {
    test(name, () => {
      const config: Record<string, string> = {
        webhookIntegrationUrl: url,
      };
      expect(() => {
        validateConfig(actionType, config);
      }).toThrowErrorMatchingInlineSnapshot(errorMsg);
    });
  });

  test("config validation returns an error if the specified URL isn't added to allowedHosts", () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (_) => {
          throw new Error(`target url is not present in allowedHosts`);
        },
      },
    });

    // any for testing
    const config: Record<string, string> = {
      webhookIntegrationUrl: 'http://mylisteningserver.com:9200/endpoint',
    };

    expect(() => {
      validateConfig(actionType, config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring send to Torq action: target url is not present in allowedHosts"`
    );
  });
});

describe('params validation', () => {
  test('params validation passes when a valid body is provided', () => {
    const params: Record<string, string> = {
      body: '{"message": "Hello"}',
    };
    expect(validateParams(actionType, params)).toEqual({
      ...params,
    });
  });
});

describe('execute Torq action', () => {
  beforeAll(() => {
    requestMock.mockReset();
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: actionsConfigMock.create(),
    });
  });

  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      status: 200,
      statusText: '',
      data: '',
      headers: [],
      config: {},
    });
  });

  test('execute with token happy flow', async () => {
    const config: ActionTypeConfigType = {
      webhookIntegrationUrl: 'https://hooks.torq.io/v1/test',
    };
    await actionType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: { token: '1234' },
      params: { body: 'some data' },
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": undefined,
        "data": "some data",
        "headers": Object {
          "X-Torq-Token": "1234",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "torq action result: {
        tag: 'ok',
        value: { status: 200, statusText: '', data: '', headers: [], config: {} }
      }",
              ],
              Array [
                "response from Torq action \\"some-id\\": [HTTP 200] ",
              ],
            ],
            "results": Array [
              Object {
                "type": "return",
                "value": undefined,
              },
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
          "log": [MockFunction],
          "trace": [MockFunction],
          "warn": [MockFunction],
        },
        "method": "post",
        "params": Object {},
        "url": "https://hooks.torq.io/v1/test",
      }
    `);
  });

  test('renders parameter templates as expected', async () => {
    const rogue = `double-quote:"; line-break->\n`;

    expect(actionType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      body: '{"x": "{{rogue}}"}',
    };
    const variables = {
      rogue,
    };
    const params = actionType.renderParameterTemplates!(paramsWithTemplates, variables);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let paramsObject: any;
    try {
      paramsObject = JSON.parse(`${params.body}`);
    } catch (err) {
      expect(err).toBe(null);
    }

    expect(paramsObject.x).toBe(rogue);
    expect(params.body).toBe(`{"x": "double-quote:\\"; line-break->\\n"}`);
  });
});
