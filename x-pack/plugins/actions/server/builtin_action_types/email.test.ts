/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
      hasAuth: true,
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
    config.hasAuth = true;
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
        "kibanaFooterLink": Object {
          "path": "/",
          "text": "Go to Kibana",
        },
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
  const config: ActionTypeConfigType = {
    service: '__json',
    host: 'a host',
    port: 42,
    secure: true,
    from: 'bob@example.com',
    hasAuth: true,
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
    kibanaFooterLink: {
      path: '/',
      text: 'Go to Kibana',
    },
  };

  const actionId = 'some-id';
  const executorOptions: EmailActionTypeExecutorOptions = {
    actionId,
    config,
    params,
    secrets,
    services,
  };

  test('ensure parameters are as expected', async () => {
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
        "configurationUtilities": Object {
          "ensureActionTypeEnabled": [MockFunction],
          "ensureHostnameAllowed": [MockFunction],
          "ensureUriAllowed": [MockFunction],
          "getProxySettings": [MockFunction],
          "isActionTypeEnabled": [MockFunction],
          "isHostnameAllowed": [MockFunction],
          "isRejectUnauthorizedCertificatesEnabled": [MockFunction],
          "isUriAllowed": [MockFunction],
        },
        "content": Object {
          "message": "a message to you

      --

      This message was sent by Kibana.",
          "subject": "the subject",
        },
        "hasAuth": true,
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
    const customExecutorOptions: EmailActionTypeExecutorOptions = {
      ...executorOptions,
      config: {
        ...config,
        service: null,
        hasAuth: false,
      },
      secrets: {
        ...secrets,
        user: null,
        password: null,
      },
    };

    sendEmailMock.mockReset();
    await actionType.executor(customExecutorOptions);
    expect(sendEmailMock.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "configurationUtilities": Object {
          "ensureActionTypeEnabled": [MockFunction],
          "ensureHostnameAllowed": [MockFunction],
          "ensureUriAllowed": [MockFunction],
          "getProxySettings": [MockFunction],
          "isActionTypeEnabled": [MockFunction],
          "isHostnameAllowed": [MockFunction],
          "isRejectUnauthorizedCertificatesEnabled": [MockFunction],
          "isUriAllowed": [MockFunction],
        },
        "content": Object {
          "message": "a message to you

      --

      This message was sent by Kibana.",
          "subject": "the subject",
        },
        "hasAuth": false,
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
    const customExecutorOptions: EmailActionTypeExecutorOptions = {
      ...executorOptions,
      config: {
        ...config,
        service: null,
        hasAuth: false,
      },
      secrets: {
        ...secrets,
        user: null,
        password: null,
      },
    };

    sendEmailMock.mockReset();
    sendEmailMock.mockRejectedValue(new Error('wops'));
    const result = await actionType.executor(customExecutorOptions);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "error sending email",
        "serviceMessage": "wops",
        "status": "error",
      }
    `);
  });

  test('renders parameter templates as expected', async () => {
    expect(actionType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      to: [],
      cc: ['{{rogue}}'],
      bcc: ['jim', '{{rogue}}', 'bob'],
      subject: '{{rogue}}',
      message: '{{rogue}}',
      kibanaFooterLink: {
        path: '/',
        text: 'Go to Kibana',
      },
    };
    const variables = {
      rogue: '*bold*',
    };
    const renderedParams = actionType.renderParameterTemplates!(paramsWithTemplates, variables);
    // Yes, this is tested in the snapshot below, but it's double-escaped there,
    // so easier to see here that the escaping is correct.
    expect(renderedParams.message).toBe('\\*bold\\*');
    expect(renderedParams).toMatchInlineSnapshot(`
      Object {
        "bcc": Array [
          "jim",
          "*bold*",
          "bob",
        ],
        "cc": Array [
          "*bold*",
        ],
        "kibanaFooterLink": Object {
          "path": "/",
          "text": "Go to Kibana",
        },
        "message": "\\\\*bold\\\\*",
        "subject": "*bold*",
        "to": Array [],
      }
    `);
  });

  test('provides a footer link to Kibana when publicBaseUrl is defined', async () => {
    const actionTypeWithPublicUrl = getActionType({
      logger: mockedLogger,
      configurationUtilities: actionsConfigMock.create(),
      publicBaseUrl: 'https://localhost:1234/foo/bar',
    });

    await actionTypeWithPublicUrl.executor(executorOptions);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sendMailCall = sendEmailMock.mock.calls[0][1];
    expect(sendMailCall.content.message).toMatchInlineSnapshot(`
      "a message to you

      --

      This message was sent by Kibana. [Go to Kibana](https://localhost:1234/foo/bar)."
    `);
  });

  test('allows to generate a deep link into Kibana when publicBaseUrl is defined', async () => {
    const actionTypeWithPublicUrl = getActionType({
      logger: mockedLogger,
      configurationUtilities: actionsConfigMock.create(),
      publicBaseUrl: 'https://localhost:1234/foo/bar',
    });

    const customExecutorOptions: EmailActionTypeExecutorOptions = {
      ...executorOptions,
      params: {
        ...params,
        kibanaFooterLink: {
          path: '/my/app',
          text: 'View this in Kibana',
        },
      },
    };

    await actionTypeWithPublicUrl.executor(customExecutorOptions);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sendMailCall = sendEmailMock.mock.calls[0][1];
    expect(sendMailCall.content.message).toMatchInlineSnapshot(`
      "a message to you

      --

      This message was sent by Kibana. [View this in Kibana](https://localhost:1234/foo/bar/my/app)."
    `);
  });
});
