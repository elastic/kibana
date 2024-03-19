/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { getComments } from '.';
import type { ConversationRole } from '@kbn/elastic-assistant/impl/assistant_context/types';

const user: ConversationRole = 'user';
const currentConversation = {
  apiConfig: {
    connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    connectorTypeTitle: 'OpenAI',
    provider: OpenAiProviderType.OpenAi,
  },
  replacements: [],
  category: 'assistant',
  id: '1',
  title: '1',
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
  refetchCurrentConversation: jest.fn(),
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
        category: 'assistant',
        apiConfig: {
          connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
          connectorTypeTitle: 'OpenAI',
          provider: OpenAiProviderType.OpenAi,
        },
        replacements: [],
        id: '1',
        title: '1',
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
