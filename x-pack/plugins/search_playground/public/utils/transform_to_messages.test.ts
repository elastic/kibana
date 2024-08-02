/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformFromChatMessages } from './transform_to_messages';
import { MessageRole, UseChatHelpers, Message, AIMessage } from '../types';

describe('transformFromChatMessages', () => {
  it('transforms messages correctly', () => {
    const messages: UseChatHelpers['messages'] = [
      {
        id: '1',
        content: 'Hello, how can I help you?',
        createdAt: new Date(),
        role: MessageRole.assistant,
        annotations: [
          {
            type: 'citations',
            documents: [
              { metadata: { _id: 'doc1', _index: 'index', _score: 1 }, pageContent: 'Document 1' },
            ],
          },
          {
            type: 'retrieved_docs',
            documents: [
              { metadata: { _id: 'doc2', _index: 'index', _score: 1 }, pageContent: 'Document 2' },
            ],
          },
          {
            type: 'context_token_count',
            count: 10,
          },
          {
            type: 'prompt_token_count',
            count: 15,
          },
          {
            type: 'context_clipped',
            count: 5,
          },
        ],
      },
      {
        id: '2',
        content: 'I am looking for information on AI.',
        createdAt: new Date(),
        role: MessageRole.user,
        annotations: [],
      },
    ];

    const expectedOutput: Message[] = [
      {
        id: '1',
        content: 'Hello, how can I help you?',
        createdAt: messages[0].createdAt,
        role: MessageRole.assistant,
        citations: [
          { content: 'Document 1', metadata: { _id: 'doc1', _index: 'index', _score: 1 } },
        ],
        retrievalDocs: [
          {
            content: 'Document 2',
            metadata: { _id: 'doc2', _index: 'index', _score: 1 },
          },
        ],
        inputTokens: {
          context: 10,
          total: 15,
          contextClipped: 5,
        },
      } as AIMessage,
      {
        id: '2',
        content: 'I am looking for information on AI.',
        createdAt: messages[1].createdAt,
        role: MessageRole.user,
      },
    ];

    const transformedMessages = transformFromChatMessages(messages);

    expect(transformedMessages).toEqual(expectedOutput);
  });
});
