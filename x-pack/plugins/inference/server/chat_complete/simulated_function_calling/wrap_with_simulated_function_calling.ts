/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantMessage, Message, ToolMessage, UserMessage } from '../../../common';
import { MessageRole } from '../../../common/chat_complete';
import { ToolChoice, ToolChoiceType, ToolDefinition } from '../../../common/chat_complete/tools';
import { TOOL_USE_END, TOOL_USE_START } from './constants';
import { getSystemMessageInstructions } from './get_system_instructions';

function replaceFunctionsWithTools(content: string) {
  return content.replaceAll(/(function)(s|[\s*\.])?(?!\scall)/g, (match, p1, p2) => {
    return `tool${p2 || ''}`;
  });
}

export function wrapWithSimulatedFunctionCalling({
  messages,
  system,
  tools,
  toolChoice,
}: {
  messages: Message[];
  system?: string;
  tools?: Record<string, ToolDefinition>;
  toolChoice?: ToolChoice<string>;
}): { messages: Message[]; system: string } {
  const instructions = getSystemMessageInstructions({
    tools,
  });

  const wrappedSystem = system ? `${system}\n${system}` : instructions;

  const wrappedMessages = messages
    .map<UserMessage | AssistantMessage>((message) => {
      if (message.role === MessageRole.Tool) {
        return convertToolMessage(message);
      }
      if (message.role === MessageRole.Assistant && message.toolCalls?.length) {
        return convertToolCallMessage(message);
      }
      return message;
    })
    .map((message) => {
      return {
        ...message,
        content: message.content ? replaceFunctionsWithTools(message.content) : message.content,
      };
    });

  if (toolChoice) {
    let selectionMessage;
    if (typeof toolChoice === 'object') {
      selectionMessage = `Remember, use the ${toolChoice.function} tool to answer this question.`;
    } else if (toolChoice === ToolChoiceType.required) {
      selectionMessage = `Remember, you MUST use one of the provided tool to answer this question.`;
    } else if (toolChoice === ToolChoiceType.auto) {
      selectionMessage = `Remember, you CAN use one of the provided tool to answer this question.`;
    }

    if (selectionMessage) {
      wrappedMessages[messages.length - 1].content += `\n${selectionMessage}`;
    }
  }

  return {
    messages: wrappedMessages as Message[],
    system: wrappedSystem,
  };
}

const convertToolMessage = (message: ToolMessage<unknown>): UserMessage => {
  const deserialized = JSON.parse((message.response as any) || '{}');

  const results: Record<string, unknown> = {
    type: 'tool_result',
    tool: message.toolCallId,
    response: deserialized,
  };

  if ('error' in deserialized) {
    results.is_error = true;
  }

  return {
    role: MessageRole.User,
    content: JSON.stringify(results),
  };
};

const convertToolCallMessage = (message: AssistantMessage): AssistantMessage => {
  // multi-call not supported by simulated mode, there will never be more than one
  const toolCall = message.toolCalls![0];

  let content = message.content || '';

  content +=
    TOOL_USE_START +
    '\n```json\n' +
    JSON.stringify({
      name: toolCall.function.name,
      input: 'arguments' in toolCall.function ? toolCall.function.arguments : {},
    }) +
    '\n```' +
    TOOL_USE_END;

  return {
    role: MessageRole.Assistant,
    content,
  };
};
