/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./send_email', () => ({
  sendEmail: jest.fn(),
}));

import { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import {
  validateConfig,
  validateConnector,
  validateParams,
  validateSecrets,
} from '@kbn/actions-plugin/server/lib';

import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { sendEmail } from './send_email';
import {
  ActionParamsType,
  getConnectorType,
  EmailConnectorType,
  EmailConnectorTypeExecutorOptions,
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
} from '.';
import { ValidateEmailAddressesOptions } from '@kbn/actions-plugin/common';
import { ActionExecutionSourceType } from '@kbn/actions-plugin/server/types';

const sendEmailMock = sendEmail as jest.Mock;

const services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: EmailConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

beforeEach(() => {
  jest.resetAllMocks();
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType({});
});

describe('connector registration', () => {
  test('returns connector type', () => {
    expect(connectorType.id).toEqual('.email');
    expect(connectorType.name).toEqual('Email');
  });
});

describe('config validation', () => {
  test('config validation succeeds when config is valid for nodemailer well known service', () => {
    const config: Record<string, unknown> = {
      service: 'gmail',
      from: 'bob@example.com',
      hasAuth: true,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
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
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
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
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
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
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
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
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
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
      validateConfig(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [from]: expected value of type [string] but got [undefined]"`
    );

    // no service or host/port
    expect(() => {
      validateConfig(connectorType, baseConfig, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [host]/[port] is required"`
    );

    // host but no port
    expect(() => {
      validateConfig(
        connectorType,
        { ...baseConfig, host: 'elastic.co' },
        { configurationUtilities }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [port] is required"`
    );

    // port but no host
    expect(() => {
      validateConfig(connectorType, { ...baseConfig, port: 8080 }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [host] is required"`
    );

    // invalid service
    expect(() => {
      validateConfig(
        connectorType,
        {
          ...baseConfig,
          service: 'bad-nodemailer-service',
        },
        { configurationUtilities }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [service] value 'bad-nodemailer-service' is not valid"`
    );

    // invalid exchange_server no clientId and no tenantId
    expect(() => {
      validateConfig(
        connectorType,
        {
          ...baseConfig,
          service: 'exchange_server',
        },
        { configurationUtilities }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [clientId]/[tenantId] is required"`
    );

    // invalid exchange_server no clientId
    expect(() => {
      validateConfig(
        connectorType,
        {
          ...baseConfig,
          service: 'exchange_server',
          tenantId: '342342342',
        },
        { configurationUtilities }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [clientId] is required"`
    );

    // invalid exchange_server no tenantId
    expect(() => {
      validateConfig(
        connectorType,
        {
          ...baseConfig,
          service: 'exchange_server',
          clientId: '12345667',
        },
        { configurationUtilities }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [tenantId] is required"`
    );
  });

  // nodemailer supports a service named 'AOL' that maps to the host below
  const NODEMAILER_AOL_SERVICE = 'AOL';
  const NODEMAILER_AOL_SERVICE_HOST = 'smtp.aol.com';

  test('config validation handles email host in allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      isHostnameAllowed: (hostname: string) => hostname === NODEMAILER_AOL_SERVICE_HOST,
    };
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

    const validatedConfig1 = validateConfig(connectorType, allowedHosts1, {
      configurationUtilities: configUtils,
    });
    expect(validatedConfig1.service).toEqual(allowedHosts1.service);
    expect(validatedConfig1.from).toEqual(allowedHosts1.from);

    const validatedConfig2 = validateConfig(connectorType, allowedHosts2, {
      configurationUtilities: configUtils,
    });
    expect(validatedConfig2.host).toEqual(allowedHosts2.host);
    expect(validatedConfig2.port).toEqual(allowedHosts2.port);
    expect(validatedConfig2.from).toEqual(allowedHosts2.from);

    expect(() => {
      validateConfig(connectorType, notAllowedHosts1, {
        configurationUtilities: configUtils,
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [service] value 'gmail' resolves to host 'smtp.gmail.com' which is not in the allowedHosts configuration"`
    );

    expect(() => {
      validateConfig(connectorType, notAllowedHosts2, { configurationUtilities: configUtils });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [host] value 'smtp.gmail.com' is not in the allowedHosts configuration"`
    );
  });

  test('config validation for emails calls validateEmailAddresses', async () => {
    const configUtils = actionsConfigMock.create();
    configUtils.validateEmailAddresses.mockImplementation(validateEmailAddressesImpl);

    expect(() => {
      validateConfig(
        connectorType,
        {
          from: 'badmail',
          service: 'gmail',
        },
        { configurationUtilities: configUtils }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [from]: stub for actual message"`
    );
    expect(configUtils.validateEmailAddresses).toHaveBeenNthCalledWith(1, ['badmail']);
  });
});

describe('secrets validation', () => {
  test('secrets validation succeeds when secrets is valid for Basic Auth', () => {
    const secrets: Record<string, unknown> = {
      user: 'bob',
      password: 'supersecret',
    };
    expect(validateSecrets(connectorType, secrets, { configurationUtilities })).toEqual({
      ...secrets,
      clientSecret: null,
    });
  });

  test('secrets validation succeeds when secrets props are null/undefined', () => {
    const secrets: Record<string, unknown> = {
      user: null,
      password: null,
      clientSecret: null,
    };
    expect(validateSecrets(connectorType, {}, { configurationUtilities })).toEqual(secrets);
    expect(validateSecrets(connectorType, { user: null }, { configurationUtilities })).toEqual(
      secrets
    );
    expect(validateSecrets(connectorType, { password: null }, { configurationUtilities })).toEqual(
      secrets
    );
  });

  test('secrets validation succeeds when secrets is valid for OAuth 2.0 Client Credentials', () => {
    const secrets: Record<string, unknown> = {
      clientSecret: '12345678',
    };
    expect(validateSecrets(connectorType, secrets, { configurationUtilities })).toEqual({
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
    expect(validateConnector(connectorType, { config, secrets })).toBeNull();
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
    expect(validateConnector(connectorType, { config, secrets })).toBeNull();
    expect(validateConnector(connectorType, { config, secrets: {} })).toBeNull();
    expect(validateConnector(connectorType, { config, secrets: { user: null } })).toBeNull();
    expect(validateConnector(connectorType, { config, secrets: { password: null } })).toBeNull();
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
      validateConnector(connectorType, { config, secrets });
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
    expect(validateConnector(connectorType, { config, secrets })).toBeNull();
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
      validateConnector(connectorType, { config, secrets });
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
    expect(validateParams(connectorType, params, { configurationUtilities }))
      .toMatchInlineSnapshot(`
      Object {
        "bcc": Array [],
        "cc": Array [],
        "kibanaFooterLink": Object {
          "path": "/",
          "text": "Go to Elastic",
        },
        "message": "this is the message",
        "messageHTML": null,
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
      validateParams(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [subject]: expected value of type [string] but got [undefined]"`
    );
  });

  test('params validation for emails calls validateEmailAddresses', async () => {
    const configUtils = actionsConfigMock.create();
    configUtils.validateEmailAddresses.mockImplementation(validateEmailAddressesImpl);

    expect(() => {
      validateParams(
        connectorType,
        {
          to: ['to@example.com'],
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
          subject: 'this is a test',
          message: 'this is the message',
        },
        { configurationUtilities: configUtils }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [to/cc/bcc]: stub for actual message"`
    );

    const allEmails = ['to@example.com', 'cc@example.com', 'bcc@example.com'];
    expect(configUtils.validateEmailAddresses).toHaveBeenNthCalledWith(1, allEmails, {
      treatMustacheTemplatesAsValid: true,
    });
  });
});

describe('execute()', () => {
  const config: ConnectorTypeConfigType = {
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
  const secrets: ConnectorTypeSecretsType = {
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
    messageHTML: null,
    kibanaFooterLink: {
      path: '/',
      text: 'Go to Elastic',
    },
  };
  const connectorUsageCollector = new ConnectorUsageCollector({
    logger: mockedLogger,
    connectorId: 'test-connector-id',
  });

  const actionId = 'some-id';
  const executorOptions: EmailConnectorTypeExecutorOptions = {
    actionId,
    config,
    params,
    secrets,
    services,
    configurationUtilities: actionsConfigMock.create(),
    logger: mockedLogger,
    connectorUsageCollector,
  };

  beforeEach(() => {
    executorOptions.configurationUtilities = actionsConfigMock.create();
  });

  test('ensure parameters are as expected', async () => {
    sendEmailMock.mockReset();
    const result = await connectorType.executor(executorOptions);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "data": undefined,
        "status": "ok",
      }
    `);
    delete sendEmailMock.mock.calls[0][1].configurationUtilities;
    expect(sendEmailMock.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "connectorId": "some-id",
        "content": Object {
          "message": "a message to you

      ---

      This message was sent by Elastic.",
          "messageHTML": null,
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

  test('ensure parameters are as expected with HTML message with source NOTIFICATION', async () => {
    sendEmailMock.mockReset();

    const executorOptionsWithHTML = {
      ...executorOptions,
      source: { type: ActionExecutionSourceType.NOTIFICATION, source: null },
      params: {
        ...executorOptions.params,
        messageHTML: '<html><body><span>My HTML message</span></body></html>',
      },
    };

    const result = await connectorType.executor(executorOptionsWithHTML);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "data": undefined,
        "status": "ok",
      }
    `);

    delete sendEmailMock.mock.calls[0][1].configurationUtilities;
    expect(sendEmailMock.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "connectorId": "some-id",
        "content": Object {
          "message": "a message to you

      ---

      This message was sent by Elastic.",
          "messageHTML": "<html><body><span>My HTML message</span></body></html>",
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

  test('ensure error when using HTML message with no source', async () => {
    sendEmailMock.mockReset();

    const executorOptionsWithHTML = {
      ...executorOptions,
      params: {
        ...executorOptions.params,
        messageHTML: '<html><body><span>My HTML message</span></body></html>',
      },
    };

    const result = await connectorType.executor(executorOptionsWithHTML);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "HTML email can only be sent via notifications",
        "status": "error",
      }
    `);
  });

  test('ensure error when using HTML message with source HTTP_REQUEST', async () => {
    sendEmailMock.mockReset();

    const executorOptionsWithHTML = {
      ...executorOptions,
      source: { type: ActionExecutionSourceType.HTTP_REQUEST, source: null },
      params: {
        ...executorOptions.params,
        messageHTML: '<html><body><span>My HTML message</span></body></html>',
      },
    };

    const result = await connectorType.executor(executorOptionsWithHTML);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "HTML email can only be sent via notifications",
        "status": "error",
      }
    `);
  });

  test('ensure error when using HTML message with source SAVED_OBJECT', async () => {
    sendEmailMock.mockReset();

    const executorOptionsWithHTML = {
      ...executorOptions,
      source: { type: ActionExecutionSourceType.HTTP_REQUEST, source: null },
      params: {
        ...executorOptions.params,
        messageHTML: '<html><body><span>My HTML message</span></body></html>',
      },
    };

    const result = await connectorType.executor(executorOptionsWithHTML);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "HTML email can only be sent via notifications",
        "status": "error",
      }
    `);
  });

  test('parameters are as expected with no auth', async () => {
    const customExecutorOptions: EmailConnectorTypeExecutorOptions = {
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
    await connectorType.executor(customExecutorOptions);
    delete sendEmailMock.mock.calls[0][1].configurationUtilities;
    expect(sendEmailMock.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "connectorId": "some-id",
        "content": Object {
          "message": "a message to you

      ---

      This message was sent by Elastic.",
          "messageHTML": null,
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
    const customExecutorOptions: EmailConnectorTypeExecutorOptions = {
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
    await connectorType.executor(customExecutorOptions);
    delete sendEmailMock.mock.calls[0][1].configurationUtilities;
    expect(sendEmailMock.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "connectorId": "some-id",
        "content": Object {
          "message": "a message to you

      ---

      This message was sent by Elastic.",
          "messageHTML": null,
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
    const customExecutorOptions: EmailConnectorTypeExecutorOptions = {
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
    const result = await connectorType.executor(customExecutorOptions);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "error sending email",
        "serviceMessage": "wops",
        "status": "error",
      }
    `);
  });

  test('returns expected result when a 450 error is thrown', async () => {
    const customExecutorOptions: EmailConnectorTypeExecutorOptions = {
      ...executorOptions,
      config: {
        ...config,
        hasAuth: false,
      },
      secrets: {
        ...secrets,
        user: null,
        password: null,
      },
    };

    const errorResponse = {
      message: 'Mail command failed: 450 4.7.1 Error: too much mail',
      response: {
        status: 450,
      },
    };

    sendEmailMock.mockReset();
    sendEmailMock.mockRejectedValue(errorResponse);
    const result = await connectorType.executor(customExecutorOptions);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "errorSource": "user",
        "message": "error sending email",
        "serviceMessage": "Mail command failed: 450 4.7.1 Error: too much mail",
        "status": "error",
      }
    `);
  });

  test('returns expected result when a 554 error is thrown', async () => {
    const customExecutorOptions: EmailConnectorTypeExecutorOptions = {
      ...executorOptions,
      config: {
        ...config,
        hasAuth: false,
      },
      secrets: {
        ...secrets,
        user: null,
        password: null,
      },
    };

    const errorResponse = {
      message: "Can't send mail - all recipients were rejected: 554 5.7.1",
      response: {
        status: 554,
      },
    };

    sendEmailMock.mockReset();
    sendEmailMock.mockRejectedValue(errorResponse);
    const result = await connectorType.executor(customExecutorOptions);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "errorSource": "user",
        "message": "error sending email",
        "serviceMessage": "Can't send mail - all recipients were rejected: 554 5.7.1",
        "status": "error",
      }
    `);
  });

  test('renders parameter templates as expected', async () => {
    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      to: [],
      cc: ['{{rogue}}'],
      bcc: ['jim', '{{rogue}}', 'bob'],
      subject: '{{rogue}}',
      message: '{{rogue}}',
      messageHTML: null,
      kibanaFooterLink: {
        path: '/',
        text: 'Go to Elastic',
      },
    };
    const variables = {
      rogue: '*bold*',
    };
    const renderedParams = connectorType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables
    );

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
          "text": "Go to Elastic",
        },
        "message": "\\\\*bold\\\\*",
        "messageHTML": null,
        "subject": "*bold*",
        "to": Array [],
      }
    `);
  });

  test('renders parameter templates with HTML as expected', async () => {
    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      to: [],
      cc: ['{{rogue}}'],
      bcc: ['jim', '{{rogue}}', 'bob'],
      subject: '{{rogue}}',
      message: '{{rogue}}',
      messageHTML: `<html><body><span>{{rogue}}</span></body></html>`,
      kibanaFooterLink: {
        path: '/',
        text: 'Go to Elastic',
      },
    };
    const variables = {
      rogue: '*bold*',
    };
    const renderedParams = connectorType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables
    );
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
          "text": "Go to Elastic",
        },
        "message": "\\\\*bold\\\\*",
        "messageHTML": "<html><body><span>*bold*</span></body></html>",
        "subject": "*bold*",
        "to": Array [],
      }
    `);
  });

  test('provides no footer link when enableFooterInEmail is false', async () => {
    const customExecutorOptions: EmailConnectorTypeExecutorOptions = {
      ...executorOptions,
      configurationUtilities: {
        ...configurationUtilities,
        enableFooterInEmail: jest.fn().mockReturnValue(false),
      },
    };

    const connectorTypeWithPublicUrl = getConnectorType({
      publicBaseUrl: 'https://localhost:1234/foo/bar',
    });

    await connectorTypeWithPublicUrl.executor(customExecutorOptions);

    expect(customExecutorOptions.configurationUtilities.enableFooterInEmail).toHaveBeenCalledTimes(
      1
    );
    const sendMailCall = sendEmailMock.mock.calls[0][1];
    expect(sendMailCall.content.message).toMatchInlineSnapshot(`"a message to you"`);
  });

  test('provides a footer link to Elastic when publicBaseUrl is defined', async () => {
    const connectorTypeWithPublicUrl = getConnectorType({
      publicBaseUrl: 'https://localhost:1234/foo/bar',
    });

    await connectorTypeWithPublicUrl.executor(executorOptions);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sendMailCall = sendEmailMock.mock.calls[0][1];
    expect(sendMailCall.content.message).toMatchInlineSnapshot(`
      "a message to you

      ---

      This message was sent by Elastic. [Go to Elastic](https://localhost:1234/foo/bar)."
    `);
  });

  test('allows to generate a deep link into Elastic when publicBaseUrl is defined', async () => {
    const connectorTypeWithPublicUrl = getConnectorType({
      publicBaseUrl: 'https://localhost:1234/foo/bar',
    });

    const customExecutorOptions: EmailConnectorTypeExecutorOptions = {
      ...executorOptions,
      params: {
        ...params,
        kibanaFooterLink: {
          path: '/my/app',
          text: 'View this in Elastic',
        },
      },
    };

    await connectorTypeWithPublicUrl.executor(customExecutorOptions);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sendMailCall = sendEmailMock.mock.calls[0][1];
    expect(sendMailCall.content.message).toMatchInlineSnapshot(`
      "a message to you

      ---

      This message was sent by Elastic. [View this in Elastic](https://localhost:1234/foo/bar/my/app)."
    `);
  });

  test('ensure execution runs validator with allowMustache false', async () => {
    const configUtils = actionsConfigMock.create();
    configUtils.validateEmailAddresses.mockImplementation(validateEmailAddressesImpl);

    const customExecutorOptions: EmailConnectorTypeExecutorOptions = {
      ...executorOptions,
      params: {
        ...params,
      },
      configurationUtilities: configUtils,
    };

    const result = await connectorType.executor(customExecutorOptions);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-id",
        "message": "[to/cc/bcc]: stub for actual message",
        "status": "error",
      }
    `);
    expect(configUtils.validateEmailAddresses.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Array [
            "jim@example.com",
            "james@example.com",
            "jimmy@example.com",
          ],
        ],
      ]
    `);
  });
});

function validateEmailAddressesImpl(
  addresses: string[],
  options?: ValidateEmailAddressesOptions
): string | undefined {
  return 'stub for actual message';
}
