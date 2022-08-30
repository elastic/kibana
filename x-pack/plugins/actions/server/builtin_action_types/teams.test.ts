/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Services } from '../types';
import { validateParams, validateSecrets } from '../lib';
import axios from 'axios';
import { ActionParamsType, ActionTypeSecretsType, getActionType, TeamsActionType } from './teams';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import { createActionTypeRegistry } from './index.test';
import * as utils from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../actions_config';

jest.mock('axios');
jest.mock('../lib/axios_utils', () => {
  const originalUtils = jest.requireActual('../lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);
const requestMock = utils.request as jest.Mock;

const ACTION_TYPE_ID = '.teams';

const services: Services = actionsMock.createServices();

let actionType: TeamsActionType;
let mockedLogger: jest.Mocked<Logger>;
let configurationUtilities: ActionsConfigurationUtilities;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<{}, ActionTypeSecretsType, ActionParamsType>(ACTION_TYPE_ID);
  mockedLogger = logger;
  configurationUtilities = actionTypeRegistry.getUtils();
});

describe('action registration', () => {
  test('returns action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('Microsoft Teams');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(
      validateParams(actionType, { message: 'a message' }, { configurationUtilities })
    ).toEqual({
      message: 'a message',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(actionType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateParams(actionType, { message: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [number]"`
    );
  });
});

describe('validateActionTypeSecrets()', () => {
  test('should validate and pass when config is valid', () => {
    validateSecrets(
      actionType,
      {
        webhookUrl: 'https://example.com',
      },
      { configurationUtilities }
    );
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateSecrets(actionType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateSecrets(actionType, { webhookUrl: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateSecrets(actionType, { webhookUrl: 'fee-fi-fo-fum' }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: error configuring teams action: unable to parse host name from webhookUrl"`
    );
  });

  test('should validate and pass when the teams webhookUrl is added to allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: (url: string) => {
        expect(url).toEqual('https://outlook.office.com/');
      },
    };
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: configUtils,
    });

    expect(
      validateSecrets(
        actionType,
        { webhookUrl: 'https://outlook.office.com/' },
        { configurationUtilities: configUtils }
      )
    ).toEqual({
      webhookUrl: 'https://outlook.office.com/',
    });
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: () => {
        throw new Error(`target hostname is not added to allowedHosts`);
      },
    };
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: configUtils,
    });

    expect(() => {
      validateSecrets(
        actionType,
        { webhookUrl: 'https://outlook.office.com/' },
        { configurationUtilities: configUtils }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: error configuring teams action: target hostname is not added to allowedHosts"`
    );
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

  test('calls the mock executor with success', async () => {
    const response = await actionType.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
    });
    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": undefined,
        "data": Object {
          "text": "this invocation should succeed",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "response from teams action \\"some-id\\": [HTTP 200] ",
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
        "url": "http://example.com",
      }
    `);
    expect(response).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "data": Object {
          "text": "this invocation should succeed",
        },
        "status": "ok",
      }
    `);
  });

  test('calls the mock executor with success proxy', async () => {
    const response = await actionType.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
    });
    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": undefined,
        "data": Object {
          "text": "this invocation should succeed",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "response from teams action \\"some-id\\": [HTTP 200] ",
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
        "url": "http://example.com",
      }
    `);
    expect(response).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "data": Object {
          "text": "this invocation should succeed",
        },
        "status": "ok",
      }
    `);
  });
});
