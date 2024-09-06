/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import {
  AssistantMessage,
  Message as InferenceMessage,
  MessageRole as InferenceMessageRole,
  generateFakeToolCallId,
} from '@kbn/inference-plugin/common';

export function convertMessagesForInference(messages: Message[]): InferenceMessage[] {
  const inferenceMessages: InferenceMessage[] = [];

  messages.forEach((message) => {
    if (message.message.role === MessageRole.Assistant) {
      inferenceMessages.push({
        role: InferenceMessageRole.Assistant,
        content: message.message.content ?? null,
        ...(message.message.function_call
          ? {
              toolCalls: [
                {
                  function: {
                    name: message.message.function_call.name,
                    arguments: JSON.parse(message.message.function_call.arguments || '{}'),
                  },
                  toolCallId: generateFakeToolCallId(),
                },
              ],
            }
          : {}),
      });
      return;
    }

    const isUserMessage = message.message.role === MessageRole.User;
    const isUserMessageWithToolCall = isUserMessage && !!message.message.name;

    if (isUserMessageWithToolCall) {
      const toolCallRequest = inferenceMessages.findLast(
        (msg) =>
          msg.role === InferenceMessageRole.Assistant &&
          msg.toolCalls?.[0]?.function.name === message.message.name
      ) as AssistantMessage | undefined;
      if (!toolCallRequest) {
        throw new Error(`Could not find tool call request for ${message.message.name}`);
      }

      inferenceMessages.push({
        role: InferenceMessageRole.Tool,
        response: JSON.parse(message.message.content ?? '{}'),
        toolCallId: toolCallRequest.toolCalls![0].toolCallId,
      });

      return;
    }

    if (isUserMessage) {
      inferenceMessages.push({
        role: InferenceMessageRole.User,
        content: message.message.content ?? '',
      });
      return;
    }

    throw new Error(`Unsupported message type: ${message.message.role}`);
  });

  return inferenceMessages;
}
