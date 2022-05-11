/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

jest.mock('./send_email_graph_api', () => ({
  sendEmailGraphApi: jest.fn(),
}));
jest.mock('./get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

import { Logger } from '@kbn/core/server';
import { sendEmail } from './send_email';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import nodemailer from 'nodemailer';
import { ProxySettings } from '../../types';
import { actionsConfigMock } from '../../actions_config.mock';
import { CustomHostSettings } from '../../config';
import { sendEmailGraphApi } from './send_email_graph_api';
import { getOAuthClientCredentialsAccessToken } from './get_oauth_client_credentials_access_token';
import { ConnectorTokenClient } from './connector_token_client';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

const createTransportMock = nodemailer.createTransport as jest.Mock;
const sendMailMockResult = { result: 'does not matter' };
const sendMailMock = jest.fn();
const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();

const connectorTokenClient = new ConnectorTokenClient({
  unsecuredSavedObjectsClient,
  encryptedSavedObjectsClient,
  logger: mockLogger,
});

describe('send_email module', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
    sendMailMock.mockResolvedValue(sendMailMockResult);
  });

  test('handles authenticated email using service', async () => {
    const sendEmailOptions = getSendEmailOptions({ transport: { service: 'other' } });
    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "auth": Object {
            "pass": "changeme",
            "user": "elastic",
          },
          "host": undefined,
          "port": undefined,
          "secure": false,
          "tls": Object {
            "rejectUnauthorized": true,
          },
        },
      ]
    `);
    expect(sendMailMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "bcc": Array [],
          "cc": Array [
            "bob@example.com",
            "robert@example.com",
          ],
          "from": "fred@example.com",
          "html": "<p>a message</p>
      ",
          "subject": "a subject",
          "text": "a message",
          "to": Array [
            "jim@example.com",
          ],
        },
      ]
    `);
  });

  test('uses OAuth 2.0 Client Credentials authentication for email using "exchange_server" service', async () => {
    const sendEmailGraphApiMock = sendEmailGraphApi as jest.Mock;
    const getOAuthClientCredentialsAccessTokenMock =
      getOAuthClientCredentialsAccessToken as jest.Mock;
    const sendEmailOptions = getSendEmailOptions({
      transport: {
        service: 'exchange_server',
        clientId: '123456',
        tenantId: '98765',
        clientSecret: 'sdfhkdsjhfksdjfh',
      },
    });
    getOAuthClientCredentialsAccessTokenMock.mockReturnValueOnce(`Bearer dfjsdfgdjhfgsjdf`);
    const date = new Date();
    date.setDate(date.getDate() + 5);

    sendEmailGraphApiMock.mockReturnValue({
      status: 202,
    });

    await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(getOAuthClientCredentialsAccessTokenMock).toHaveBeenCalledWith({
      configurationUtilities: sendEmailOptions.configurationUtilities,
      connectorId: '1',
      connectorTokenClient,
      credentials: {
        config: { clientId: '123456', tenantId: '98765' },
        secrets: { clientSecret: 'sdfhkdsjhfksdjfh' },
      },
      logger: mockLogger,
      oAuthScope: 'https://graph.microsoft.com/.default',
      tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
    });

    delete sendEmailGraphApiMock.mock.calls[0][0].options.configurationUtilities;
    sendEmailGraphApiMock.mock.calls[0].pop();
    expect(sendEmailGraphApiMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "graphApiUrl": undefined,
          "headers": Object {
            "Authorization": "Bearer dfjsdfgdjhfgsjdf",
            "Content-Type": "application/json",
          },
          "messageHTML": "<p>a message</p>
      ",
          "options": Object {
            "connectorId": "1",
            "content": Object {
              "message": "a message",
              "subject": "a subject",
            },
            "hasAuth": true,
            "routing": Object {
              "bcc": Array [],
              "cc": Array [
                "bob@example.com",
                "robert@example.com",
              ],
              "from": "fred@example.com",
              "to": Array [
                "jim@example.com",
              ],
            },
            "transport": Object {
              "clientId": "123456",
              "clientSecret": "sdfhkdsjhfksdjfh",
              "password": "changeme",
              "service": "exchange_server",
              "tenantId": "98765",
              "user": "elastic",
            },
          },
        },
        Object {
          "context": Array [],
          "debug": [MockFunction],
          "error": [MockFunction],
          "fatal": [MockFunction],
          "get": [MockFunction],
          "info": [MockFunction],
          "log": [MockFunction],
          "trace": [MockFunction],
          "warn": [MockFunction],
        },
      ]
    `);
  });

  test('throws error if null access token returned when using OAuth 2.0 Client Credentials authentication', async () => {
    const sendEmailGraphApiMock = sendEmailGraphApi as jest.Mock;
    const getOAuthClientCredentialsAccessTokenMock =
      getOAuthClientCredentialsAccessToken as jest.Mock;
    const sendEmailOptions = getSendEmailOptions({
      transport: {
        service: 'exchange_server',
        clientId: '123456',
        tenantId: '98765',
        clientSecret: 'sdfhkdsjhfksdjfh',
      },
    });
    getOAuthClientCredentialsAccessTokenMock.mockReturnValueOnce(null);

    await expect(() =>
      sendEmail(mockLogger, sendEmailOptions, connectorTokenClient)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to retrieve access token for connectorId: 1"`
    );

    expect(getOAuthClientCredentialsAccessTokenMock).toHaveBeenCalledWith({
      configurationUtilities: sendEmailOptions.configurationUtilities,
      connectorId: '1',
      connectorTokenClient,
      credentials: {
        config: { clientId: '123456', tenantId: '98765' },
        secrets: { clientSecret: 'sdfhkdsjhfksdjfh' },
      },
      logger: mockLogger,
      oAuthScope: 'https://graph.microsoft.com/.default',
      tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
    });

    expect(sendEmailGraphApiMock).not.toHaveBeenCalled();
  });

  test('handles unauthenticated email using not secure host/port', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
          service: 'other',
        },
      },
      {
        proxyUrl: 'https://example.com',
        proxySSLSettings: {
          verificationMode: 'none',
        },
        proxyBypassHosts: undefined,
        proxyOnlyHosts: undefined,
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "headers": undefined,
          "host": "example.com",
          "port": 1025,
          "proxy": "https://example.com",
          "secure": false,
          "tls": Object {
            "rejectUnauthorized": false,
          },
        },
      ]
    `);
    expect(sendMailMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "bcc": Array [],
          "cc": Array [
            "bob@example.com",
            "robert@example.com",
          ],
          "from": "fred@example.com",
          "html": "<p>a message</p>
      ",
          "subject": "a subject",
          "text": "a message",
          "to": Array [
            "jim@example.com",
          ],
        },
      ]
    `);
  });

  test('verificationMode default setting email using not secure host/port', async () => {
    const sendEmailOptions = getSendEmailOptions({
      transport: {
        host: 'example.com',
        port: 1025,
      },
    });
    // @ts-expect-error
    delete sendEmailOptions.transport.service;
    // @ts-expect-error
    delete sendEmailOptions.transport.user;
    // @ts-expect-error
    delete sendEmailOptions.transport.password;
    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "host": "example.com",
          "port": 1025,
          "secure": false,
          "tls": Object {
            "rejectUnauthorized": false,
          },
        },
      ]
    `);
    expect(sendMailMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "bcc": Array [],
          "cc": Array [
            "bob@example.com",
            "robert@example.com",
          ],
          "from": "fred@example.com",
          "html": "<p>a message</p>
      ",
          "subject": "a subject",
          "text": "a message",
          "to": Array [
            "jim@example.com",
          ],
        },
      ]
    `);
  });

  test('handles unauthenticated email using secure host/port', async () => {
    const sendEmailOptions = getSendEmailOptions({
      transport: {
        host: 'example.com',
        port: 1025,
        secure: true,
      },
    });
    // @ts-expect-error
    delete sendEmailOptions.transport.service;
    // @ts-expect-error
    delete sendEmailOptions.transport.user;
    // @ts-expect-error
    delete sendEmailOptions.transport.password;

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "host": "example.com",
          "port": 1025,
          "secure": true,
          "tls": Object {
            "rejectUnauthorized": true,
          },
        },
      ]
    `);
    expect(sendMailMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "bcc": Array [],
          "cc": Array [
            "bob@example.com",
            "robert@example.com",
          ],
          "from": "fred@example.com",
          "html": "<p>a message</p>
      ",
          "subject": "a subject",
          "text": "a message",
          "to": Array [
            "jim@example.com",
          ],
        },
      ]
    `);
  });

  test('passes nodemailer exceptions to caller', async () => {
    const sendEmailOptions = getSendEmailOptions();

    sendMailMock.mockReset();
    sendMailMock.mockRejectedValue(new Error('wops'));

    await expect(sendEmail(mockLogger, sendEmailOptions, connectorTokenClient)).rejects.toThrow(
      'wops'
    );
  });

  test('it bypasses with proxyBypassHosts when expected', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
        },
      },
      {
        proxyUrl: 'https://proxy.com',
        proxySSLSettings: {
          verificationMode: 'none',
        },
        proxyBypassHosts: new Set(['example.com']),
        proxyOnlyHosts: undefined,
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "host": "example.com",
          "port": 1025,
          "secure": false,
          "tls": Object {
            "rejectUnauthorized": false,
          },
        },
      ]
    `);
  });

  test('it does not bypass with proxyBypassHosts when expected', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
        },
      },
      {
        proxyUrl: 'https://proxy.com',
        proxySSLSettings: {
          verificationMode: 'none',
        },
        proxyBypassHosts: new Set(['not-example.com']),
        proxyOnlyHosts: undefined,
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "headers": undefined,
          "host": "example.com",
          "port": 1025,
          "proxy": "https://proxy.com",
          "secure": false,
          "tls": Object {
            "rejectUnauthorized": false,
          },
        },
      ]
    `);
  });

  test('it proxies with proxyOnlyHosts when expected', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
        },
      },
      {
        proxyUrl: 'https://proxy.com',
        proxySSLSettings: {
          verificationMode: 'none',
        },
        proxyBypassHosts: undefined,
        proxyOnlyHosts: new Set(['example.com']),
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "headers": undefined,
          "host": "example.com",
          "port": 1025,
          "proxy": "https://proxy.com",
          "secure": false,
          "tls": Object {
            "rejectUnauthorized": false,
          },
        },
      ]
    `);
  });

  test('it does not proxy with proxyOnlyHosts when expected', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
        },
      },
      {
        proxyUrl: 'https://proxy.com',
        proxySSLSettings: {},
        proxyBypassHosts: undefined,
        proxyOnlyHosts: new Set(['not-example.com']),
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "host": "example.com",
          "port": 1025,
          "secure": false,
          "tls": Object {
            "rejectUnauthorized": false,
          },
        },
      ]
    `);
  });

  test('it handles custom host settings from config', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
        },
      },
      undefined,
      {
        url: 'smtp://example.com:1025',
        ssl: {
          certificateAuthoritiesData: 'ca cert data goes here',
        },
        smtp: {
          ignoreTLS: false,
          requireTLS: true,
        },
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);

    // note in the object below, the rejectUnauthenticated got set to false,
    // given the implementation allowing that for no auth and !secure.
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "host": "example.com",
          "port": 1025,
          "requireTLS": true,
          "secure": false,
          "tls": Object {
            "ca": "ca cert data goes here",
            "rejectUnauthorized": false,
          },
        },
      ]
    `);
  });

  test('it allows custom host settings to override calculated values', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
        },
      },
      undefined,
      {
        url: 'smtp://example.com:1025',
        ssl: {
          certificateAuthoritiesData: 'ca cert data goes here',
          rejectUnauthorized: true,
        },
        smtp: {
          ignoreTLS: true,
          requireTLS: false,
        },
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);

    // in this case, rejectUnauthorized is true, as the custom host settings
    // overrode the calculated value of false
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "host": "example.com",
          "ignoreTLS": true,
          "port": 1025,
          "secure": false,
          "tls": Object {
            "ca": "ca cert data goes here",
            "rejectUnauthorized": true,
          },
        },
      ]
    `);
  });

  test('it handles custom host settings with a proxy', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
        },
      },
      {
        proxyUrl: 'https://proxy.com',
        proxySSLSettings: {},
        proxyBypassHosts: undefined,
        proxyOnlyHosts: undefined,
      },
      {
        url: 'smtp://example.com:1025',
        ssl: {
          certificateAuthoritiesData: 'ca cert data goes here',
          rejectUnauthorized: true,
        },
        smtp: {
          requireTLS: true,
        },
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions, connectorTokenClient);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "headers": undefined,
          "host": "example.com",
          "port": 1025,
          "proxy": "https://proxy.com",
          "requireTLS": true,
          "secure": false,
          "tls": Object {
            "ca": "ca cert data goes here",
            "rejectUnauthorized": true,
          },
        },
      ]
    `);
  });
});

function getSendEmailOptions(
  { content = {}, routing = {}, transport = {} } = {},
  proxySettings?: ProxySettings,
  customHostSettings?: CustomHostSettings
) {
  const configurationUtilities = actionsConfigMock.create();
  if (proxySettings) {
    configurationUtilities.getProxySettings.mockReturnValue(proxySettings);
  }
  if (customHostSettings) {
    configurationUtilities.getCustomHostSettings.mockReturnValue(customHostSettings);
  }
  return {
    content: {
      message: 'a message',
      subject: 'a subject',
      ...content,
    },
    routing: {
      from: 'fred@example.com',
      to: ['jim@example.com'],
      cc: ['bob@example.com', 'robert@example.com'],
      bcc: [],
      ...routing,
    },
    transport: {
      service: 'other',
      user: 'elastic',
      password: 'changeme',
      ...transport,
    },
    hasAuth: true,
    configurationUtilities,
    connectorId: '1',
  };
}

function getSendEmailOptionsNoAuth(
  { content = {}, routing = {}, transport = {} } = {},
  proxySettings?: ProxySettings,
  customHostSettings?: CustomHostSettings
) {
  const configurationUtilities = actionsConfigMock.create();
  if (proxySettings) {
    configurationUtilities.getProxySettings.mockReturnValue(proxySettings);
  }
  if (customHostSettings) {
    configurationUtilities.getCustomHostSettings.mockReturnValue(customHostSettings);
  }
  return {
    content: {
      ...content,
      message: 'a message',
      subject: 'a subject',
    },
    routing: {
      ...routing,
      from: 'fred@example.com',
      to: ['jim@example.com'],
      cc: ['bob@example.com', 'robert@example.com'],
      bcc: [],
    },
    transport: {
      service: 'other',
      ...transport,
    },
    hasAuth: false,
    configurationUtilities,
    connectorId: '2',
  };
}
