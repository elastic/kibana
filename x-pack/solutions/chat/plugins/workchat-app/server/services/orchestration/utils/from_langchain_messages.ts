/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BaseMessage,
  MessageContentComplex,
  isAIMessage,
  isHumanMessage,
} from '@langchain/core/messages';
import type { ToolCall as LangchainToolCall } from '@langchain/core/messages/tool';
import { AppLogger } from '../../../utils';
import {
  createUserMessage,
  createAssistantMessage,
  type ToolCall,
} from '../../../../common/conversation_events';

export const messageFromLangchain = (message: BaseMessage) => {
  if (isAIMessage(message)) {
    const toolCalls = message.tool_calls?.map(convertLangchainToolCall) ?? [];
    return createAssistantMessage({
      id: message.id,
      content: extractTextContent(message),
      toolCalls,
    });
  }
  if (isHumanMessage(message)) {
    return createUserMessage({ id: message.id, content: extractTextContent(message) });
  }

  // tools will come later
  throw new Error(`Unsupported message type ${message}`);
};

const convertLangchainToolCall = (toolCall: LangchainToolCall): ToolCall => {
  AppLogger.getInstance().debug(
    `Calling tool: ${toolCall.name} with args: ${JSON.stringify(toolCall.args)}`
  );
  return {
    toolCallId: toolCall.id!, // TODO: figure out a default, e.g {messageId}_{callIndex}
    toolName: toolCall.name,
    args: toolCall.args,
  };
};

export const extractTextContent = (message: BaseMessage): string => {
  if (typeof message.content === 'string') {
    return message.content;
  } else {
    let content = '';
    for (const item of message.content as MessageContentComplex[]) {
      if (item.type === 'text') {
        content += item.text;
      }
    }
    return content;
  }
};
