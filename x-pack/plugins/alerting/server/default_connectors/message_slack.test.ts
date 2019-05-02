/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as slackMock from 'slack';
import { messageSlackConnector } from './message_slack';

jest.mock('slack', () => ({
  chat: {
    postMessage: jest.fn(),
  },
}));

test('Calls the slack API with the proper arguments', async () => {
  await messageSlackConnector.executor({ token: '123' }, { message: 'hello', channel: 'general' });
  expect(slackMock.chat.postMessage).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "channel": "general",
        "text": "hello",
        "token": "123",
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": undefined,
    },
  ],
}
`);
});
