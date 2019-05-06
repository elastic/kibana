/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => {
    return {
      sendMail: jest.fn(),
    };
  }),
}));

import { emailConnector } from './email';

test('calls the nodemailer API with proper arguments', async () => {
  // eslint-disable-next-line
  const nodemailer = require('nodemailer');
  await emailConnector.executor(
    {
      port: 123,
      host: 'localhost',
      auth: {
        type: 'PLAIN',
        username: 'admin',
        password: 'admin',
      },
    },
    {
      from: 'me@localhost',
      to: ['you@localhost'],
      cc: ['cc@localhost'],
      bcc: ['bcc@localhost'],
      subject: 'My subject',
      text: 'My text',
      html: 'My html',
    }
  );
  expect(nodemailer.createTransport).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "auth": Object {
          "password": "admin",
          "type": "PLAIN",
          "username": "admin",
        },
        "host": "localhost",
        "port": 123,
      },
      Object {
        "secure": true,
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": Object {
        "sendMail": [MockFunction] {
          "calls": Array [
            Array [
              Object {
                "bcc": Array [
                  "bcc@localhost",
                ],
                "cc": Array [
                  "cc@localhost",
                ],
                "from": "me@localhost",
                "html": "My html",
                "subject": "My subject",
                "text": "My text",
                "to": Array [
                  "you@localhost",
                ],
              },
            ],
          ],
          "results": Array [
            Object {
              "type": "return",
              "value": undefined,
            },
          ],
        },
      },
    },
  ],
}
`);
});
