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
import { validateConfig, validateConnector, validateParams, validateSecrets } from '../lib';
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
  test('config validation succeeds when config is valid for nodemailer well known service', () => {
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
      clientId: null,
      tenantId: null,
      oauthTokenUrl: null,
    });
  });

  test(`config validation succeeds when config is valid and defaults to 'other' when service is undefined`, () => {
    const config: Record<string, unknown> = {
      from: 'bob@example.com',
      host: 'elastic.co',
      port: 8080,
      hasAuth: true,
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      service: 'other',
      secure: null,
      clientId: null,
      tenantId: null,
      oauthTokenUrl: null,
    });
  });

  test(`config validation succeeds when config is valid and service requires custom host/port value`, () => {
    const config: Record<string, unknown> = {
      service: 'other',
      from: 'bob@example.com',
      host: 'elastic.co',
      port: 8080,
      hasAuth: true,
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      secure: null,
      clientId: null,
      tenantId: null,
      oauthTokenUrl: null,
    });
  });

  test(`config validation succeeds when config is valid and service is exchange_server`, () => {
    const config: Record<string, unknown> = {
      service: 'exchange_server',
      from: 'bob@example.com',
      clientId: '123456',
      tenantId: '12345778',
      hasAuth: true,
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      secure: null,
      host: null,
      port: null,
      oauthTokenUrl: null,
    });
  });

  test(`config validation succeeds when config is valid and service is elastic_cloud`, () => {
    const config: Record<string, unknown> = {
      service: 'elastic_cloud',
      from: 'bob@example.com',
      hasAuth: true,
    };
    expect(validateConfig(actionType, config)).toEqual({
      ...config,
      host: null,
      port: null,
      secure: null,
      clientId: null,
      tenantId: null,
      oauthTokenUrl: null,
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
      `"error validating action type config: [host]/[port] is required"`
    );

    // host but no port
    expect(() => {
      validateConfig(actionType, { ...baseConfig, host: 'elastic.co' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [port] is required"`
    );

    // port but no host
    expect(() => {
      validateConfig(actionType, { ...baseConfig, port: 8080 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [host] is required"`
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

    // invalid exchange_server no clientId and no tenantId
    expect(() => {
      validateConfig(actionType, {
        ...baseConfig,
        service: 'exchange_server',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [clientId]/[tenantId] is required"`
    );

    // invalid exchange_server no clientId
    expect(() => {
      validateConfig(actionType, {
        ...baseConfig,
        service: 'exchange_server',
        tenantId: '342342342',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [clientId] is required"`
    );

    // invalid exchange_server no tenantId
    expect(() => {
      validateConfig(actionType, {
        ...baseConfig,
        service: 'exchange_server',
        clientId: '12345667',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [tenantId] is required"`
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
  test('secrets validation succeeds when secrets is valid for Basic Auth', () => {
    const secrets: Record<string, unknown> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(actionType, secrets)).toEqual({ ...secrets, clientSecret: null });
  });

  test('secrets validation succeeds when secrets props are null/undefined', () => {
    const secrets: Record<string, unknown> = {
      user: null,
      password: null,
      clientSecret: null,
    };
    expect(validateSecrets(actionType, {})).toEqual(secrets);
    expect(validateSecrets(actionType, { user: null })).toEqual(secrets);
    expect(validateSecrets(actionType, { password: null })).toEqual(secrets);
  });

  test('secrets validation succeeds when secrets is valid for OAuth 2.0 Client Credentials', () => {
    const secrets: Record<string, unknown> = {
      clientSecret: '12345678',
    };
    expect(validateSecrets(actionType, secrets)).toEqual({
      ...secrets,
      user: null,
      password: null,
    });
  });
});

describe('connector validation: secrets with config', () => {
  test('connector validation succeeds when username/password was populated for hasAuth true', () => {
    const secrets: Record<string, unknown> = {
      user: 'bob',
      password: 'supersecret',
    };
    const config: Record<string, unknown> = {
      hasAuth: true,
    };
    expect(validateConnector(actionType, { config, secrets })).toBeNull();
  });

  test('connector validation succeeds when username/password not filled for hasAuth false', () => {
    const secrets: Record<string, unknown> = {
      user: null,
      password: null,
      clientSecret: null,
    };
    const config: Record<string, unknown> = {
      hasAuth: false,
    };
    expect(validateConnector(actionType, { config, secrets })).toBeNull();
    expect(validateConnector(actionType, { config, secrets: {} })).toBeNull();
    expect(validateConnector(actionType, { config, secrets: { user: null } })).toBeNull();
    expect(validateConnector(actionType, { config, secrets: { password: null } })).toBeNull();
  });

  test('connector validation fails when username/password was populated for hasAuth true', () => {
    const secrets: Record<string, unknown> = {
      password: null,
      user: null,
    };
    const config: Record<string, unknown> = {
      hasAuth: true,
    };
    // invalid user
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: [user] is required"`
    );
  });

  test('connector validation succeeds when service is exchange_server and clientSecret is populated', () => {
    const secrets: Record<string, unknown> = {
      clientSecret: '12345678',
    };
    const config: Record<string, unknown> = {
      service: 'exchange_server',
    };
    expect(validateConnector(actionType, { config, secrets })).toBeNull();
  });

  test('connector validation fails when service is exchange_server and clientSecret is not populated', () => {
    const secrets: Record<string, unknown> = {
      clientSecret: null,
    };
    const config: Record<string, unknown> = {
      service: 'exchange_server',
    };
    // invalid user
    expect(() => {
      validateConnector(actionType, { config, secrets });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type connector: [clientSecret] is required"`
    );
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
    clientId: null,
    tenantId: null,
    oauthTokenUrl: null,
  };
  const secrets: ActionTypeSecretsType = {
    user: 'bob',
    password: 'supersecret',
    clientSecret: null,
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
          "getCustomHostSettings": [MockFunction],
          "getMicrosoftGraphApiUrl": [MockFunction],
          "getProxySettings": [MockFunction],
          "getResponseSettings": [MockFunction],
          "getSSLSettings": [MockFunction],
          "isActionTypeEnabled": [MockFunction],
          "isHostnameAllowed": [MockFunction],
          "isUriAllowed": [MockFunction],
        },
        "connectorId": "some-id",
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
        service: 'other',
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
          "getCustomHostSettings": [MockFunction],
          "getMicrosoftGraphApiUrl": [MockFunction],
          "getProxySettings": [MockFunction],
          "getResponseSettings": [MockFunction],
          "getSSLSettings": [MockFunction],
          "isActionTypeEnabled": [MockFunction],
          "isHostnameAllowed": [MockFunction],
          "isUriAllowed": [MockFunction],
        },
        "connectorId": "some-id",
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

  test('parameters are as expected when using elastic_cloud service', async () => {
    const customExecutorOptions: EmailActionTypeExecutorOptions = {
      ...executorOptions,
      config: {
        ...config,
        service: 'elastic_cloud',
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
          "getCustomHostSettings": [MockFunction],
          "getMicrosoftGraphApiUrl": [MockFunction],
          "getProxySettings": [MockFunction],
          "getResponseSettings": [MockFunction],
          "getSSLSettings": [MockFunction],
          "isActionTypeEnabled": [MockFunction],
          "isHostnameAllowed": [MockFunction],
          "isUriAllowed": [MockFunction],
        },
        "connectorId": "some-id",
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
          "host": "dockerhost",
          "port": 10025,
          "secure": false,
        },
      }
    `);
  });

  test('returns expected result when an error is thrown', async () => {
    const customExecutorOptions: EmailActionTypeExecutorOptions = {
      ...executorOptions,
      config: {
        ...config,
        service: 'other',
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
