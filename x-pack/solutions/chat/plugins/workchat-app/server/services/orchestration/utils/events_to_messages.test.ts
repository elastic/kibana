/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import {
  createUserMessage,
  createAssistantMessage,
  createToolResult,
  ConversationEventType,
} from '../../../../common/conversation_events';
import { conversationEventsToMessages } from './events_to_messages';

describe('conversationEventsToMessages', () => {
  it('should convert user message to HumanMessage', () => {
    const userMessage = createUserMessage({
      content: 'Hello, how are you?',
    });

    const result = conversationEventsToMessages([userMessage]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(HumanMessage);
    expect(result[0].content).toBe('Hello, how are you?');
  });

  it('should convert assistant message to AIMessage', () => {
    const assistantMessage = createAssistantMessage({
      content: 'I am doing well, thank you!',
      toolCalls: [
        {
          toolCallId: 'call-1',
          toolName: 'search',
          args: { query: 'test' },
        },
      ],
    });

    const result = conversationEventsToMessages([assistantMessage]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(AIMessage);
    expect(result[0].content).toBe('I am doing well, thank you!');
    const aiMessage = result[0] as AIMessage & {
      tool_calls: Array<{ id: string; name: string; args: any; type: string }>;
    };
    expect(aiMessage.tool_calls).toHaveLength(1);
    expect(aiMessage.tool_calls[0]).toEqual({
      id: 'call-1',
      name: 'search',
      args: { query: 'test' },
      type: 'tool_call',
    });
  });

  it('should convert tool result to ToolMessage', () => {
    const toolResult = createToolResult({
      toolCallId: 'call-1',
      toolResult: 'Search results: ...',
    });

    const result = conversationEventsToMessages([toolResult]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(ToolMessage);
    expect(result[0].content).toBe('Search results: ...');
    const toolMessage = result[0] as ToolMessage;
    expect(toolMessage.tool_call_id).toBe('call-1');
  });

  it('should handle multiple events in sequence', () => {
    const events = [
      createUserMessage({
        content: 'Hello',
      }),
      createAssistantMessage({
        content: 'Hi there!',
        toolCalls: [],
      }),
      createToolResult({
        toolCallId: 'call-1',
        toolResult: 'Result',
      }),
    ];

    const result = conversationEventsToMessages(events);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeInstanceOf(HumanMessage);
    expect(result[1]).toBeInstanceOf(AIMessage);
    expect(result[2]).toBeInstanceOf(ToolMessage);
  });

  it('should handle unknown event types by returning empty array', () => {
    const unknownEvent = {
      type: 'unknown_type' as ConversationEventType,
      id: 'test-id',
      createdAt: new Date().toISOString(),
      content: 'test',
    };

    const result = conversationEventsToMessages([unknownEvent as any]);
    expect(result).toHaveLength(0);
  });
});
