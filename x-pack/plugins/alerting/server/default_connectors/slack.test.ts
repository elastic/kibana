/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as slackMock from 'slack';
import { slackConnector } from './slack';

jest.mock('slack', () => ({
  chat: {
    postMessage: jest.fn(),
  },
}));

test(`executor throws error when command isn't valid`, async () => {
  await expect(
    slackConnector.executor({ token: '123' }, { command: 'invalid' })
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unsupported command \\"invalid\\"."`);
});

describe('post-message', () => {
  test('Calls the slack API with the proper arguments', async () => {
    await slackConnector.executor(
      { token: '123' },
      { command: 'post-message', message: 'hello', channel: 'general' }
    );
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
});
