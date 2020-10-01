/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/send_email', () => ({
  sendEmail: jest.fn(),
}));

import { Logger } from '../../../../../src/core/server';

import { actionsConfigMock } from '../actions_config.mock';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { createActionTypeRegistry } from './index.test';
import { sendEmail } from './lib/send_email';
import { actionsMock } from '../mocks';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ActionTypeSecretsType,
  getActionType,
  EmailActionType,
  EmailActionTypeExecutorOptions,
} from './email';

const sendEmailMock = sendEmail as jest.Mock;

const ACTION_TYPE_ID = '.email';

const services = actionsMock.createServices();

let actionType: EmailActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeEach(() => {
  jest.resetAllMocks();
  const { actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<
    ActionTypeConfigType,
    ActionTypeSecretsType,
    ActionParamsType
  >(ACTION_TYPE_ID);
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('Email');
  });
});

describe('config validation', () => {
  test('config validation succeeds when config is valid', () => {
    const config: Record<string, unknown> = {
      service: 'gmail',
      from: 'bob@example.com',
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      host: null,
      port: null,
      secure: null,
    });

    delete config.service;
    config.host = 'elastic.co';
    config.port = 8080;
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      service: null,
      secure: null,
    });
  });

  test('config validation fails when config is not valid', () => {
    const baseConfig: Record<string, unknown> = {
      from: 'bob@example.com',
    };

    // empty object
    expect(() => {
      validateConfig(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [from]: expected value of type [string] but got [undefined]"`
    );

    // no service or host/port
    expect(() => {
      validateConfig(actionType, baseConfig);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: either [service] or [host]/[port] is required"`
    );

    // host but no port
    expect(() => {
      validateConfig(actionType, { ...baseConfig, host: 'elastic.co' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [port] is required if [service] is not provided"`
    );

    // port but no host
    expect(() => {
      validateConfig(actionType, { ...baseConfig, port: 8080 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [host] is required if [service] is not provided"`
    );

    // invalid service
    expect(() => {
      validateConfig(actionType, {
        ...baseConfig,
        service: 'bad-nodemailer-service',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [service] value 'bad-nodemailer-service' is not valid"`
    );
  });

  // nodemailer supports a service named 'AOL' that maps to the host below
  const NODEMAILER_AOL_SERVICE = 'AOL';
  const NODEMAILER_AOL_SERVICE_HOST = 'smtp.aol.com';

  test('config validation handles email host in allowedHosts', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        isHostnameAllowed: (hostname) => hostname === NODEMAILER_AOL_SERVICE_HOST,
      },
    });
    const baseConfig = {
      from: 'bob@example.com',
    };
    const allowedHosts1 = {
      ...baseConfig,
      service: NODEMAILER_AOL_SERVICE,
    };
    const allowedHosts2 = {
      ...baseConfig,
      host: NODEMAILER_AOL_SERVICE_HOST,
      port: 42,
    };
    const notAllowedHosts1 = {
      ...baseConfig,
      service: 'gmail',
    };

    const notAllowedHosts2 = {
      ...baseConfig,
      host: 'smtp.gmail.com',
      port: 42,
    };

    const validatedConfig1 = validateConfig(actionType, allowedHosts1);
    expect(validatedConfig1.service).toEqual(allowedHosts1.service);
    expect(validatedConfig1.from).toEqual(allowedHosts1.from);

    const validatedConfig2 = validateConfig(actionType, allowedHosts2);
    expect(validatedConfig2.host).toEqual(allowedHosts2.host);
    expect(validatedConfig2.port).toEqual(allowedHosts2.port);
    expect(validatedConfig2.from).toEqual(allowedHosts2.from);

    expect(() => {
      validateConfig(actionType, notAllowedHosts1);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [service] value 'gmail' resolves to host 'smtp.gmail.com' which is not in the allowedHosts configuration"`
    );

    expect(() => {
      validateConfig(actionType, notAllowedHosts2);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [host] value 'smtp.gmail.com' is not in the allowedHosts configuration"`
    );
  });
});

describe('secrets validation', () => {
  test('secrets validation succeeds when secrets is valid', () => {
    const secrets: Record<string, unknown> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('secrets validation succeeds when secrets props are null/undefined', () => {
    const secrets: Record<string, unknown> = {
      user: null,
      password: null,
    };
    expect(validateSecrets(actionType, {})).toEqual(secrets);
    expect(validateSecrets(actionType, { user: null })).toEqual(secrets);
    expect(validateSecrets(actionType, { password: null })).toEqual(secrets);
  });
});

describe('params validation', () => {
  test('params validation succeeds when params is valid', () => {
    const params: Record<string, unknown> = {
      to: ['bob@example.com'],
      subject: 'this is a test',
      message: 'this is the message',
    };
    expect(validateParams(actionType, params)).toMatchInlineSnapshot(`
      Object {
        "bcc": Array [],
        "cc": Array [],
        "message": "this is the message",
        "subject": "this is a test",
        "to": Array [
          "bob@example.com",
        ],
      }
    `);
  });

  test('params validation fails when params is not valid', () => {
    // empty object
    expect(() => {
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [subject]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('execute()', () => {
  test('ensure parameters are as expected', async () => {
    const config: ActionTypeConfigType = {
      service: '__json',
      host: 'a host',
      port: 42,
      secure: true,
      from: 'bob@example.com',
    };
    const secrets: ActionTypeSecretsType = {
      user: 'bob',
      password: 'supersecret',
    };
    const params: ActionParamsType = {
      to: ['jim@example.com'],
      cc: ['james@example.com'],
      bcc: ['jimmy@example.com'],
      subject: 'the subject',
      message: 'a message to you',
    };

    const actionId = 'some-id';
    const executorOptions: EmailActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    sendEmailMock.mockReset();
    const result = await actionType.executor(executorOptions);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "data": undefined,
        "status": "ok",
      }
    `);
    expect(sendEmailMock.mock.calls[0][1]).toMatchInlineSnapshot(`
          Object {
            "content": Object {
              "message": "a message to you",
              "subject": "the subject",
            },
            "proxySettings": undefined,
            "routing": Object {
              "bcc": Array [
                "jimmy@example.com",
              ],
              "cc": Array [
                "james@example.com",
              ],
              "from": "bob@example.com",
              "to": Array [
                "jim@example.com",
              ],
            },
            "transport": Object {
              "password": "supersecret",
              "service": "__json",
              "user": "bob",
            },
          }
    `);
  });

  test('parameters are as expected with no auth', async () => {
    const config: ActionTypeConfigType = {
      service: null,
      host: 'a host',
      port: 42,
      secure: true,
      from: 'bob@example.com',
    };
    const secrets: ActionTypeSecretsType = {
      user: null,
      password: null,
    };
    const params: ActionParamsType = {
      to: ['jim@example.com'],
      cc: ['james@example.com'],
      bcc: ['jimmy@example.com'],
      subject: 'the subject',
      message: 'a message to you',
    };

    const actionId = 'some-id';
    const executorOptions: EmailActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    sendEmailMock.mockReset();
    await actionType.executor(executorOptions);
    expect(sendEmailMock.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "content": Object {
          "message": "a message to you",
          "subject": "the subject",
        },
        "proxySettings": undefined,
        "routing": Object {
          "bcc": Array [
            "jimmy@example.com",
          ],
          "cc": Array [
            "james@example.com",
          ],
          "from": "bob@example.com",
          "to": Array [
            "jim@example.com",
          ],
        },
        "transport": Object {
          "host": "a host",
          "port": 42,
          "secure": true,
        },
      }
    `);
  });

  test('returns expected result when an error is thrown', async () => {
    const config: ActionTypeConfigType = {
      service: null,
      host: 'a host',
      port: 42,
      secure: true,
      from: 'bob@example.com',
    };
    const secrets: ActionTypeSecretsType = {
      user: null,
      password: null,
    };
    const params: ActionParamsType = {
      to: ['jim@example.com'],
      cc: ['james@example.com'],
      bcc: ['jimmy@example.com'],
      subject: 'the subject',
      message: 'a message to you',
    };

    const actionId = 'some-id';
    const executorOptions: EmailActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    sendEmailMock.mockReset();
    sendEmailMock.mockRejectedValue(new Error('wops'));
    const result = await actionType.executor(executorOptions);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "error sending email",
        "serviceMessage": "wops",
        "status": "error",
      }
    `);
  });
});
