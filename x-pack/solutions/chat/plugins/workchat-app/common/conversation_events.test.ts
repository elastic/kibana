/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationEventType,
  createUserMessage,
  createAssistantMessage,
  createToolResult,
  isUserMessage,
  isAssistantMessage,
  isToolResult,
} from './conversation_events';

describe('conversation_events', () => {
  describe('createUserMessage', () => {
    it('should create a user message with the provided content', () => {
      const message = createUserMessage({
        content: 'Hello',
      });

      expect(message.type).toBe(ConversationEventType.userMessage);
      expect(message.content).toBe('Hello');
      expect(message.id).toBeDefined();
      expect(message.createdAt).toBeDefined();
    });

    it('should use provided id and createdAt if available', () => {
      const message = createUserMessage({
        id: 'custom-id',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(message.id).toBe('custom-id');
      expect(message.createdAt).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('createAssistantMessage', () => {
    it('should create an assistant message with default values', () => {
      const message = createAssistantMessage({});

      expect(message.type).toBe(ConversationEventType.assistantMessage);
      expect(message.content).toBe('');
      expect(message.toolCalls).toEqual([]);
      expect(message.id).toBeDefined();
      expect(message.createdAt).toBeDefined();
    });

    it('should use provided values if available', () => {
      const toolCalls = [
        {
          toolCallId: 'tool-1',
          toolName: 'calculator',
          args: { expression: '2+2' },
        },
      ];

      const message = createAssistantMessage({
        id: 'custom-id',
        content: 'I calculated that for you',
        toolCalls,
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(message.id).toBe('custom-id');
      expect(message.content).toBe('I calculated that for you');
      expect(message.toolCalls).toEqual(toolCalls);
      expect(message.createdAt).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('createToolResult', () => {
    it('should create a tool result with required values', () => {
      const toolResult = createToolResult({
        toolCallId: 'tool-1',
        toolResult: '4',
      });

      expect(toolResult.type).toBe(ConversationEventType.toolResult);
      expect(toolResult.toolCallId).toBe('tool-1');
      expect(toolResult.toolResult).toBe('4');
      expect(toolResult.id).toBeDefined();
      expect(toolResult.createdAt).toBeDefined();
    });

    it('should use provided id and createdAt if available', () => {
      const toolResult = createToolResult({
        id: 'custom-id',
        toolCallId: 'tool-1',
        toolResult: '4',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(toolResult.id).toBe('custom-id');
      expect(toolResult.createdAt).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('isUserMessage', () => {
    it('should return true for user messages', () => {
      const userMessage = createUserMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isUserMessage(userMessage)).toBe(true);
    });

    it('should return false for non-user messages', () => {
      const assistantMessage = createAssistantMessage({
        id: 'msg-2',
        content: 'Hello there',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isUserMessage(assistantMessage)).toBe(false);

      const toolResult = createToolResult({
        id: 'result-1',
        toolCallId: 'tool-1',
        toolResult: '4',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isUserMessage(toolResult)).toBe(false);
    });
  });

  describe('isAssistantMessage', () => {
    it('should return true for assistant messages', () => {
      const assistantMessage = createAssistantMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isAssistantMessage(assistantMessage)).toBe(true);
    });

    it('should return false for non-assistant messages', () => {
      const userMessage = createUserMessage({
        id: 'msg-2',
        content: 'Hello there',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isAssistantMessage(userMessage)).toBe(false);

      const toolResult = createToolResult({
        id: 'result-1',
        toolCallId: 'tool-1',
        toolResult: '4',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isAssistantMessage(toolResult)).toBe(false);
    });
  });

  describe('isToolResult', () => {
    it('should return true for tool results', () => {
      const toolResult = createToolResult({
        id: 'result-1',
        toolCallId: 'tool-1',
        toolResult: '4',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isToolResult(toolResult)).toBe(true);
    });

    it('should return false for non-tool results', () => {
      const userMessage = createUserMessage({
        id: 'msg-1',
        content: 'Hello',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isToolResult(userMessage)).toBe(false);

      const assistantMessage = createAssistantMessage({
        id: 'msg-2',
        content: 'Hello there',
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      expect(isToolResult(assistantMessage)).toBe(false);
    });
  });
});
