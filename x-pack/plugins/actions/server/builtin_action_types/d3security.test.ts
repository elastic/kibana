/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Services } from '../types';
import axios from 'axios';
import { ActionParamsType, ActionTypeSecretsType, ActionTypeConfigType, getActionType, D3ActionType } from './d3security';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import { createActionTypeRegistry } from './index.test';
import * as utils from './lib/axios_utils';
import { validateConfig, validateSecrets, validateParams } from '../lib';


jest.mock('axios');
jest.mock('./lib/axios_utils', () => {
  const originalUtils = jest.requireActual('./lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);
const requestMock = utils.request as jest.Mock;
axios.create = jest.fn(() => axios);

const ACTION_TYPE_ID = '.d3security';
const ACTION_NAME = 'D3 Security';

const services: Services = actionsMock.createServices();

let actionType: D3ActionType;
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

describe('action registration', () => {
  test('returns action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual(ACTION_NAME);
  });
});

describe('validateActionTypeSecrets()', () => {
    test('should validate and pass when config is valid', () => {
      validateSecrets(actionType, {
        token: 'token',
      });
    });
  
    test('should validate and throw error when config is invalid', () => {
      expect(() => {
        validateSecrets(actionType, {});
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating action type secrets: token must be specified"`
      );
  
      expect(() => {
        validateSecrets(actionType, { webhookUrl: 1 });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating action type secrets: [webhookUrl]: definition for this key is missing"`
      );
  
      expect(() => {
        validateSecrets(actionType, { webhookUrl: 'fee-fi-fo-fum' });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating action type secrets: [webhookUrl]: definition for this key is missing"`
      );
    });
});

describe('validateActionTypeConfig()', () => {
  test('should validate and pass when config is valid', () => {
    validateConfig(actionType, {
      url: 'https://example.com',
    });
  });

    test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [url]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateConfig(actionType, { url: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [url]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateConfig(actionType, { url: 'fee-fi-fo-fum' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring d3security action: unable to parse url: TypeError: Invalid URL: fee-fi-fo-fum"`
    );
  });


  test('should validate and pass when the url is added to allowedHosts', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (url) => {
          expect(url).toEqual('https://outlook.office.com/');
        },
      },
    });

    expect(validateConfig(actionType, { url: 'https://outlook.office.com/' })).toEqual({
      url: 'https://outlook.office.com/',
    });
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureUriAllowed: () => {
          throw new Error(`target hostname is not added to allowedHosts`);
        },
      },
    });

    expect(() => {
      validateConfig(actionType, { url: 'https://outlook.office.com/' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring d3security action: target hostname is not added to allowedHosts"`
    );
  });
});

  describe('params validation', () => {
    test('param validation passes when no fields are provided as none are required', () => {
      const params: Record<string, string> = {};
      expect(validateParams(actionType, params)).toEqual({});
    });
  
    test('params validation passes when a valid body is provided', () => {
      const params: Record<string, string> = {
        body: 'count: {{ctx.payload.hits.total}}',
      };
      expect(validateParams(actionType, params)).toEqual({
        ...params,
      });
    });
  });

  describe('execute()', () => {
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

  test('execute with token authentication', async () => {
    const config: ActionTypeConfigType = {
        url: 'https://abc.def/VSOC/api/my-command'
      };
    const secrets: ActionTypeSecretsType = { token:"myToken" };
    await actionType.executor({
        actionId: 'some-id',
        services,
        config,
        secrets,
        params: { body: 'some data' },
      });
      delete requestMock.mock.calls[0][0].configurationUtilities;
      expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "axios": undefined,
          "data": "some data",
          "headers": Object {
            "d3key": "myToken",
          },
          "logger": Object {
            "context": Array [],
            "debug": [MockFunction] {
              "calls": Array [
                Array [
                  "response from d3 action \\\"some-id\\\": [HTTP 200] ",
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
          "url": "https://abc.def/VSOC/api/my-command",
        }
      `);
    });
  
    test('execute with exception maxContentLength size exceeded should log the proper error', async () => {
        const config: ActionTypeConfigType = {
            url: 'https://abc.def/VSOC/api/my-command'
          };
        const secrets: ActionTypeSecretsType = { token:"myToken" };
        
        requestMock.mockReset();
        requestMock.mockRejectedValueOnce({
          tag: 'err',
          isAxiosError: true,
          message: 'maxContentLength size of 1000000 exceeded',
        });
        await actionType.executor({
          actionId: 'some-id',
          services,
          config,
          secrets,
          params: { body: 'some data' },
        });
        expect(mockedLogger.error).toBeCalledWith(
          'error on some-id d3 event: maxContentLength size of 1000000 exceeded'
        );
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
      expect(err).toBe(null); // kinda weird, but test should fail if it can't parse
    }

    expect(paramsObject.x).toBe(rogue);
    expect(params.body).toBe(`{"x": "double-quote:\\"; line-break->\\n"}`);
  });

});


