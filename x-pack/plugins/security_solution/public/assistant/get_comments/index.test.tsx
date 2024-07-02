/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MessageRole } from '@kbn/elastic-assistant-common';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { getComments } from '.';

const user: MessageRole = 'user';
const currentConversation = {
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    provider: OpenAiProviderType.OpenAi,
  },
  replacements: {},
  category: 'assistant',
  id: '1',
  title: '1',
  messages: [
    {
      role: user,
      content: 'Hello {name}',
      timestamp: '2024-03-19T18:59:18.174Z',
      isError: false,
    },
  ],
};
const showAnonymizedValues = false;
const testProps = {
  abortStream: jest.fn(),
  setIsStreaming: jest.fn(),
  refetchCurrentConversation: jest.fn(),
  regenerateMessage: jest.fn(),
  isEnabledLangChain: false,
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
          actionTypeId: '.gen-ai',
          connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
          provider: OpenAiProviderType.OpenAi,
        },
        replacements: {},
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

  it('It transforms message timestamp from server side ISO format to local date string', () => {
    const result = getComments(testProps);
    expect(result[0].timestamp).toEqual(
      `at: ${new Date('2024-03-19T18:59:18.174Z').toLocaleString()}`
    );
  });
});
