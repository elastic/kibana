/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getComments } from '.';
import type { ConversationRole } from '@kbn/elastic-assistant/impl/assistant_context/types';

const user: ConversationRole = 'user';
const currentConversation = {
  apiConfig: {},
  id: '1',
  messages: [
    {
      role: user,
      content: 'Hello {name}',
      timestamp: '2022-01-01',
      isError: false,
    },
  ],
};
const showAnonymizedValues = false;
const testProps = {
  amendMessage: jest.fn(),
  regenerateMessage: jest.fn(),
  isFetchingResponse: false,
  currentConversation,
  showAnonymizedValues,
};
describe('getComments', () => {
  it('Does not add error state message has no error', () => {
    const result = getComments(testProps);
    expect(result[0].eventColor).toEqual(undefined);
  });
  it('Adds error state when message has error', () => {
    const result = getComments({
      ...testProps,
      currentConversation: {
        apiConfig: {},
        id: '1',
        messages: [
          {
            role: user,
            content: 'Hello {name}',
            timestamp: '2022-01-01',
            isError: true,
          },
        ],
      },
    });
    expect(result[0].eventColor).toEqual('danger');
  });
});
