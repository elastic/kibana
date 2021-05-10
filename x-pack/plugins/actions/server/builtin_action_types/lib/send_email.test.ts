/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

import { Logger } from '../../../../../../src/core/server';
import { sendEmail } from './send_email';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import nodemailer from 'nodemailer';
import { ProxySettings } from '../../types';
import { actionsConfigMock } from '../../actions_config.mock';
import { CustomHostSettings } from '../../config';

const createTransportMock = nodemailer.createTransport as jest.Mock;
const sendMailMockResult = { result: 'does not matter' };
const sendMailMock = jest.fn();

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('send_email module', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
    sendMailMock.mockResolvedValue(sendMailMockResult);
  });

  test('handles authenticated email using service', async () => {
    const sendEmailOptions = getSendEmailOptions();
    const result = await sendEmail(mockLogger, sendEmailOptions);
    expect(result).toBe(sendMailMockResult);
    expect(createTransportMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "auth": Object {
            "pass": "changeme",
            "user": "elastic",
          },
          "service": "whatever",
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

  test('handles unauthenticated email using not secure host/port', async () => {
    const sendEmailOptions = getSendEmailOptionsNoAuth(
      {
        transport: {
          host: 'example.com',
          port: 1025,
        },
      },
      {
        proxyUrl: 'https://example.com',
        proxyRejectUnauthorizedCertificates: false,
        proxyBypassHosts: undefined,
        proxyOnlyHosts: undefined,
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions);
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

  test('rejectUnauthorized default setting email using not secure host/port', async () => {
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
    const result = await sendEmail(mockLogger, sendEmailOptions);
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

    const result = await sendEmail(mockLogger, sendEmailOptions);
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

    await expect(sendEmail(mockLogger, sendEmailOptions)).rejects.toThrow('wops');
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
        proxyRejectUnauthorizedCertificates: false,
        proxyBypassHosts: new Set(['example.com']),
        proxyOnlyHosts: undefined,
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions);
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
        proxyRejectUnauthorizedCertificates: false,
        proxyBypassHosts: new Set(['not-example.com']),
        proxyOnlyHosts: undefined,
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions);
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
        proxyRejectUnauthorizedCertificates: false,
        proxyBypassHosts: undefined,
        proxyOnlyHosts: new Set(['example.com']),
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions);
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
        proxyRejectUnauthorizedCertificates: false,
        proxyBypassHosts: undefined,
        proxyOnlyHosts: new Set(['not-example.com']),
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions);
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
        tls: {
          certificateAuthoritiesData: 'ca cert data goes here',
        },
        smtp: {
          ignoreTLS: false,
          requireTLS: true,
        },
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions);
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
        tls: {
          certificateAuthoritiesData: 'ca cert data goes here',
          rejectUnauthorized: true,
        },
        smtp: {
          ignoreTLS: true,
          requireTLS: false,
        },
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions);
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
        proxyRejectUnauthorizedCertificates: false,
        proxyBypassHosts: undefined,
        proxyOnlyHosts: undefined,
      },
      {
        url: 'smtp://example.com:1025',
        tls: {
          certificateAuthoritiesData: 'ca cert data goes here',
          rejectUnauthorized: true,
        },
        smtp: {
          requireTLS: true,
        },
      }
    );

    const result = await sendEmail(mockLogger, sendEmailOptions);
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
      ...transport,
      service: 'whatever',
      user: 'elastic',
      password: 'changeme',
    },
    hasAuth: true,
    configurationUtilities,
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
      ...transport,
    },
    hasAuth: false,
    configurationUtilities,
  };
}
