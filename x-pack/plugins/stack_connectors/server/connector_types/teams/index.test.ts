/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ConnectorUsageCollector, Services } from '@kbn/actions-plugin/server/types';
import { validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import axios from 'axios';
import { getConnectorType, TeamsConnectorType, ConnectorTypeId } from '.';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
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
const services: Services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: TeamsConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;
let connectorUsageCollector: ConnectorUsageCollector;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
  connectorUsageCollector = new ConnectorUsageCollector({
    logger: mockedLogger,
    connectorId: 'test-connector-id',
  });
});

describe('connector registration', () => {
  test('returns connector type', () => {
    expect(connectorType.id).toEqual(ConnectorTypeId);
    expect(connectorType.name).toEqual('Microsoft Teams');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(
      validateParams(connectorType, { message: 'a message' }, { configurationUtilities })
    ).toEqual({
      message: 'a message',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateParams(connectorType, { message: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [number]"`
    );
  });
});

describe('validateActionTypeSecrets()', () => {
  test('should validate and pass when config is valid', () => {
    validateSecrets(
      connectorType,
      {
        webhookUrl: 'https://example.com',
      },
      { configurationUtilities }
    );
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateSecrets(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateSecrets(connectorType, { webhookUrl: 1 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [webhookUrl]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateSecrets(connectorType, { webhookUrl: 'fee-fi-fo-fum' }, { configurationUtilities });
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

    expect(
      validateSecrets(
        connectorType,
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

    expect(() => {
      validateSecrets(
        connectorType,
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

  test('calls the mock executor with success', async () => {
    const response = await connectorType.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": undefined,
        "connectorUsageCollector": ConnectorUsageCollector {
          "connectorId": "test-connector-id",
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
            "isLevelEnabled": [MockFunction],
            "log": [MockFunction],
            "trace": [MockFunction],
            "warn": [MockFunction],
          },
          "usage": Object {
            "requestBodyBytes": 0,
          },
        },
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
          "isLevelEnabled": [MockFunction],
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
    const response = await connectorType.executor({
      actionId: 'some-id',
      services,
      config: {},
      secrets: { webhookUrl: 'http://example.com' },
      params: { message: 'this invocation should succeed' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": undefined,
        "connectorUsageCollector": ConnectorUsageCollector {
          "connectorId": "test-connector-id",
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
            "isLevelEnabled": [MockFunction],
            "log": [MockFunction],
            "trace": [MockFunction],
            "warn": [MockFunction],
          },
          "usage": Object {
            "requestBodyBytes": 0,
          },
        },
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
          "isLevelEnabled": [MockFunction],
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
