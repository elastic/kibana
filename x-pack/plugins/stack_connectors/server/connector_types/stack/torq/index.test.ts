/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';

import axios from 'axios';
import { ActionTypeConfigType, getActionType, TorqActionType } from '.';

import * as utils from '../../../../../actions/server/lib/axios_utils';
import { validateConfig, validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { Services } from '@kbn/actions-plugin/server/types';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggerMock } from '@kbn/logging-mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';

jest.mock('axios');
jest.mock('../../../../../actions/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('../../../../../actions/server/lib/axios_utils');
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
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

beforeAll(() => {
  actionType = getActionType();
  configurationUtilities = actionsConfigMock.create();
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
    expect(validateSecrets(actionType, secrets, { configurationUtilities })).toEqual(secrets);
  });

  test('fails when secret token is not provided', () => {
    expect(() => {
      validateSecrets(actionType, {}, { configurationUtilities });
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
    expect(validateConfig(actionType, config, { configurationUtilities })).toEqual({
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
        validateConfig(actionType, config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(errorMsg);
    });
  });

  test("config validation returns an error if the specified URL isn't added to allowedHosts", () => {
    actionType = getActionType();

    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: (_: string) => {
        throw new Error(`target url is not present in allowedHosts`);
      },
    };

    // any for testing
    const config: Record<string, string> = {
      webhookIntegrationUrl: 'http://mylisteningserver.com:9200/endpoint',
    };

    expect(() => {
      validateConfig(actionType, config, { configurationUtilities: configUtils });
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
    expect(validateParams(actionType, params, { configurationUtilities })).toEqual({
      ...params,
    });
  });
});

describe('execute Torq action', () => {
  beforeAll(() => {
    requestMock.mockReset();
    actionType = getActionType();
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
      params: { body: '{"msg": "some data"}' },
      configurationUtilities: configurationUtilities,
      logger: mockedLogger,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": [MockFunction],
        "data": Object {
          "msg": "some data",
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Torq-Token": "1234",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "response from Torq action \\"some-id\\": [HTTP 200] ",
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
          "log": [MockFunction],
          "trace": [MockFunction],
          "warn": [MockFunction],
        },
        "method": "post",
        "url": "https://hooks.torq.io/v1/test",
        "validateStatus": [Function],
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
