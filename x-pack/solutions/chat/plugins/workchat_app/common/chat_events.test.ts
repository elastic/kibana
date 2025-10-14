/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUserMessage, createAssistantMessage } from './conversation_events';
import {
  isMessageEvent,
  isToolResultEvent,
  isChunkEvent,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  conversationCreatedEvent,
  conversationUpdatedEvent,
  chunkEvent,
  messageEvent,
  toolResultEvent,
} from './chat_events';

describe('chat_events', () => {
  describe('isMessageEvent', () => {
    it('should return true for message events', () => {
      const userMessage = createUserMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });
      expect(isMessageEvent(messageEvent({ message: userMessage }))).toBe(true);
    });

    it('should return false for non-message events', () => {
      expect(
        isMessageEvent(
          chunkEvent({
            contentChunk: 'Hello',
            messageId: 'msg-1',
          })
        )
      ).toBe(false);
    });
  });

  describe('isChunkEvent', () => {
    it('should return true for chunk events', () => {
      expect(
        isChunkEvent(
          chunkEvent({
            contentChunk: 'Hello',
            messageId: 'msg-1',
          })
        )
      ).toBe(true);
    });

    it('should return false for non-chunk events', () => {
      const assistantMessage = createAssistantMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
        toolCalls: [],
      });
      expect(isChunkEvent(messageEvent({ message: assistantMessage }))).toBe(false);
    });
  });

  describe('isToolResultEvent', () => {
    it('should return true for tool result events', () => {
      expect(
        isToolResultEvent(
          toolResultEvent({
            callId: 'call-1',
            result: 'Result from tool',
          })
        )
      ).toBe(true);
    });

    it('should return false for non-tool result events', () => {
      const userMessage = createUserMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });
      expect(isToolResultEvent(messageEvent({ message: userMessage }))).toBe(false);
    });
  });

  describe('isConversationCreatedEvent', () => {
    it('should return true for conversation created events', () => {
      expect(
        isConversationCreatedEvent(
          conversationCreatedEvent({
            id: 'conv-1',
            title: 'Test Conversation',
          })
        )
      ).toBe(true);
    });

    it('should return false for non-conversation created events', () => {
      const userMessage = createUserMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });
      expect(isConversationCreatedEvent(messageEvent({ message: userMessage }))).toBe(false);
    });
  });

  describe('isConversationUpdatedEvent', () => {
    it('should return true for conversation updated events', () => {
      expect(
        isConversationUpdatedEvent(
          conversationUpdatedEvent({
            id: 'conv-1',
            title: 'Updated Test Conversation',
          })
        )
      ).toBe(true);
    });

    it('should return false for non-conversation updated events', () => {
      const userMessage = createUserMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });
      expect(isConversationUpdatedEvent(messageEvent({ message: userMessage }))).toBe(false);
    });
  });

  describe('conversationCreatedEvent', () => {
    it('should create a conversation created event', () => {
      expect(
        conversationCreatedEvent({
          id: 'conv-1',
          title: 'Test Conversation',
        })
      ).toEqual({
        type: 'conversation_created',
        conversation: {
          id: 'conv-1',
          title: 'Test Conversation',
        },
      });
    });
  });

  describe('conversationUpdatedEvent', () => {
    it('should create a conversation updated event', () => {
      expect(
        conversationUpdatedEvent({
          id: 'conv-1',
          title: 'Updated Test Conversation',
        })
      ).toEqual({
        type: 'conversation_updated',
        conversation: {
          id: 'conv-1',
          title: 'Updated Test Conversation',
        },
      });
    });
  });

  describe('chunkEvent', () => {
    it('should create a chunk event', () => {
      expect(
        chunkEvent({
          contentChunk: 'partial response',
          messageId: 'msg-1',
        })
      ).toEqual({
        type: 'message_chunk',
        content_chunk: 'partial response',
        message_id: 'msg-1',
      });
    });
  });

  describe('messageEvent', () => {
    it('should create a message event with a user message', () => {
      const userMessage = createUserMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(
        messageEvent({
          message: userMessage,
        })
      ).toEqual({
        type: 'message',
        message: userMessage,
      });
    });

    it('should create a message event with an assistant message', () => {
      const assistantMessage = createAssistantMessage({
        id: 'msg-2',
        content: 'Hello there',
        createdAt: '2023-01-01T00:00:00.000Z',
        toolCalls: [],
      });

      expect(
        messageEvent({
          message: assistantMessage,
        })
      ).toEqual({
        type: 'message',
        message: assistantMessage,
      });
    });
  });

  describe('toolResultEvent', () => {
    it('should create a tool result event', () => {
      expect(
        toolResultEvent({
          callId: 'call-1',
          result: 'Result from tool execution',
        })
      ).toEqual({
        type: 'tool_result',
        toolResult: {
          callId: 'call-1',
          result: 'Result from tool execution',
        },
      });
    });
  });
});
