/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage, BaseMessage, MessageType } from '@langchain/core/messages';
import { messageFromLangchain } from './from_langchain_messages';
import { ConversationEventType } from '../../../../common/conversation_events';

jest.mock('../../../utils/app_logger', () => {
  return {
    AppLogger: {
      getInstance: jest.fn().mockReturnValue({
        debug: jest.fn(),
      }),
    },
  };
});

describe('messageFromLangchain', () => {
  it('should convert an AI message with string content', () => {
    const message = new AIMessage({
      content: 'Hello, I am an AI',
      id: 'ai-1',
    });

    const result = messageFromLangchain(message);

    expect(result).toMatchObject({
      type: ConversationEventType.assistantMessage,
      id: 'ai-1',
      content: 'Hello, I am an AI',
      toolCalls: [],
    });
    expect(result.createdAt).toBeDefined();
  });

  it('should convert an AI message with complex text content', () => {
    const message = new AIMessage({
      content: [
        { type: 'text', text: 'Hello, ' },
        { type: 'text', text: 'I am an AI' },
      ],
      id: 'ai-2',
    });

    const result = messageFromLangchain(message);

    expect(result).toMatchObject({
      type: ConversationEventType.assistantMessage,
      id: 'ai-2',
      content: 'Hello, I am an AI',
      toolCalls: [],
    });
    expect(result.createdAt).toBeDefined();
  });

  it('should handle mixed content types in AI message', () => {
    const message = new AIMessage({
      content: [
        { type: 'text', text: 'Hello, ' },
        { type: 'image', image_url: 'https://example.com/image.jpg' },
        { type: 'text', text: 'I am an AI' },
        { type: 'function', function: { name: 'test', arguments: '{}' } },
      ],
      id: 'ai-2',
    });

    const result = messageFromLangchain(message);

    expect(result).toMatchObject({
      type: ConversationEventType.assistantMessage,
      id: 'ai-2',
      content: 'Hello, I am an AI',
      toolCalls: [],
    });
    expect(result.createdAt).toBeDefined();
  });

  it('should convert an AI message with tool calls', () => {
    const message = new AIMessage({
      content: 'I will help you with that',
      id: 'ai-3',
      tool_calls: [
        {
          id: 'tool-1',
          name: 'search',
          args: { query: 'test' },
        },
      ],
    });

    const result = messageFromLangchain(message);

    expect(result).toMatchObject({
      type: ConversationEventType.assistantMessage,
      id: 'ai-3',
      content: 'I will help you with that',
      toolCalls: [
        {
          toolCallId: 'tool-1',
          toolName: 'search',
          args: { query: 'test' },
        },
      ],
    });
  });

  it('should convert a human message', () => {
    const message = new HumanMessage({
      content: 'Hello, can you help me?',
      id: 'human-1',
    });

    const result = messageFromLangchain(message);

    expect(result).toMatchObject({
      type: ConversationEventType.userMessage,
      id: 'human-1',
      content: 'Hello, can you help me?',
    });
  });

  it('should throw an error for unsupported message types', () => {
    // Create a class that extends BaseMessage but doesn't implement the required methods
    class UnsupportedMessage extends BaseMessage {
      constructor() {
        super({ content: 'test' });
      }
      _getType(): MessageType {
        throw new Error('Unsupported message type');
      }
    }

    const unsupportedMessage = new UnsupportedMessage();

    expect(() => messageFromLangchain(unsupportedMessage)).toThrow('Unsupported message type');
  });
});
