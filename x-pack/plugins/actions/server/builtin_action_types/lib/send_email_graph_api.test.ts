/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
jest.mock('axios', () => ({
  create: jest.fn(),
}));

import axios from 'axios';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { CustomHostSettings } from '../../config';
import { ProxySettings } from '../../types';
import { sendEmailGraphApi } from './send_email_graph_api';

const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = jest.fn();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('sendEmailGraphApi', () => {
  beforeEach(() => {
    createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
  });
  const configurationUtilities = actionsConfigMock.create();

  test('email contains the proper message', async () => {
    axiosInstanceMock.mockReturnValueOnce({
      status: 202,
    });
    await sendEmailGraphApi(
      { options: getSendEmailOptions(), messageHTML: 'test1', headers: {} },
      logger,
      configurationUtilities
    );
    expect(axiosInstanceMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://graph.microsoft.com/v1.0/users/fred@example.com/sendMail",
        Object {
          "data": Object {
            "message": Object {
              "bccRecipients": Array [],
              "body": Object {
                "content": "test1",
                "contentType": "HTML",
              },
              "ccRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "bob@example.com",
                  },
                },
                Object {
                  "emailAddress": Object {
                    "address": "robert@example.com",
                  },
                },
              ],
              "subject": "a subject",
              "toRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "jim@example.com",
                  },
                },
              ],
            },
          },
          "headers": Object {},
          "httpAgent": undefined,
          "httpsAgent": Agent {
            "_events": Object {
              "free": [Function],
              "newListener": [Function],
            },
            "_eventsCount": 2,
            "_maxListeners": undefined,
            "_sessionCache": Object {
              "list": Array [],
              "map": Object {},
            },
            "defaultPort": 443,
            "freeSockets": Object {},
            "keepAlive": false,
            "keepAliveMsecs": 1000,
            "maxCachedSessions": 100,
            "maxFreeSockets": 256,
            "maxSockets": Infinity,
            "maxTotalSockets": Infinity,
            "options": Object {
              "path": null,
              "rejectUnauthorized": true,
            },
            "protocol": "https:",
            "requests": Object {},
            "scheduling": "lifo",
            "sockets": Object {},
            "totalSocketCount": 0,
            Symbol(kCapture): false,
          },
          "maxContentLength": 1000000,
          "method": "post",
          "proxy": false,
          "timeout": 360000,
          "validateStatus": [Function],
        },
      ]
      `);
  });

  test('email was sent on behalf of the user "from" mailbox', async () => {
    axiosInstanceMock.mockReturnValueOnce({
      status: 202,
    });
    await sendEmailGraphApi(
      {
        options: getSendEmailOptions(),
        messageHTML: 'test2',
        headers: { Authorization: 'Bearer 1234567' },
      },
      logger,
      configurationUtilities
    );
    expect(axiosInstanceMock.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "https://graph.microsoft.com/v1.0/users/fred@example.com/sendMail",
        Object {
          "data": Object {
            "message": Object {
              "bccRecipients": Array [],
              "body": Object {
                "content": "test2",
                "contentType": "HTML",
              },
              "ccRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "bob@example.com",
                  },
                },
                Object {
                  "emailAddress": Object {
                    "address": "robert@example.com",
                  },
                },
              ],
              "subject": "a subject",
              "toRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "jim@example.com",
                  },
                },
              ],
            },
          },
          "headers": Object {
            "Authorization": "Bearer 1234567",
          },
          "httpAgent": undefined,
          "httpsAgent": Agent {
            "_events": Object {
              "free": [Function],
              "newListener": [Function],
            },
            "_eventsCount": 2,
            "_maxListeners": undefined,
            "_sessionCache": Object {
              "list": Array [],
              "map": Object {},
            },
            "defaultPort": 443,
            "freeSockets": Object {},
            "keepAlive": false,
            "keepAliveMsecs": 1000,
            "maxCachedSessions": 100,
            "maxFreeSockets": 256,
            "maxSockets": Infinity,
            "maxTotalSockets": Infinity,
            "options": Object {
              "path": null,
              "rejectUnauthorized": true,
            },
            "protocol": "https:",
            "requests": Object {},
            "scheduling": "lifo",
            "sockets": Object {},
            "totalSocketCount": 0,
            Symbol(kCapture): false,
          },
          "maxContentLength": 1000000,
          "method": "post",
          "proxy": false,
          "timeout": 360000,
          "validateStatus": [Function],
        },
      ]
      `);
  });

  test('sendMail request was sent to the custom configured Graph API URL', async () => {
    axiosInstanceMock.mockReturnValueOnce({
      status: 202,
    });
    await sendEmailGraphApi(
      {
        options: getSendEmailOptions(),
        messageHTML: 'test3',
        headers: {},
        graphApiUrl: 'https://test',
      },
      logger,
      configurationUtilities
    );
    expect(axiosInstanceMock.mock.calls[2]).toMatchInlineSnapshot(`
      Array [
        "https://test/users/fred@example.com/sendMail",
        Object {
          "data": Object {
            "message": Object {
              "bccRecipients": Array [],
              "body": Object {
                "content": "test3",
                "contentType": "HTML",
              },
              "ccRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "bob@example.com",
                  },
                },
                Object {
                  "emailAddress": Object {
                    "address": "robert@example.com",
                  },
                },
              ],
              "subject": "a subject",
              "toRecipients": Array [
                Object {
                  "emailAddress": Object {
                    "address": "jim@example.com",
                  },
                },
              ],
            },
          },
          "headers": Object {},
          "httpAgent": undefined,
          "httpsAgent": Agent {
            "_events": Object {
              "free": [Function],
              "newListener": [Function],
            },
            "_eventsCount": 2,
            "_maxListeners": undefined,
            "_sessionCache": Object {
              "list": Array [],
              "map": Object {},
            },
            "defaultPort": 443,
            "freeSockets": Object {},
            "keepAlive": false,
            "keepAliveMsecs": 1000,
            "maxCachedSessions": 100,
            "maxFreeSockets": 256,
            "maxSockets": Infinity,
            "maxTotalSockets": Infinity,
            "options": Object {
              "path": null,
              "rejectUnauthorized": true,
            },
            "protocol": "https:",
            "requests": Object {},
            "scheduling": "lifo",
            "sockets": Object {},
            "totalSocketCount": 0,
            Symbol(kCapture): false,
          },
          "maxContentLength": 1000000,
          "method": "post",
          "proxy": false,
          "timeout": 360000,
          "validateStatus": [Function],
        },
      ]
      `);
  });

  test('throw the exception and log the proper error if message was not sent successfuly', async () => {
    axiosInstanceMock.mockReturnValueOnce({
      status: 400,
      data: {
        error: {
          code: 'ErrorMimeContentInvalidBase64String',
          message: 'Invalid base64 string for MIME content.',
        },
      },
    });

    await expect(
      sendEmailGraphApi(
        { options: getSendEmailOptions(), messageHTML: 'test1', headers: {} },
        logger,
        configurationUtilities
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"{\\"error\\":{\\"code\\":\\"ErrorMimeContentInvalidBase64String\\",\\"message\\":\\"Invalid base64 string for MIME content.\\"}}"'
    );

    expect(logger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "error thrown sending Microsoft Exchange email for clientID: undefined: {\\"error\\":{\\"code\\":\\"ErrorMimeContentInvalidBase64String\\",\\"message\\":\\"Invalid base64 string for MIME content.\\"}}",
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
      service: 'exchange_server',
      clienySecret: 'gfhfh',
    },
    hasAuth: true,
    configurationUtilities,
    connectorId: '1',
  };
}
