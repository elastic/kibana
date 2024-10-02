/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionDefinition, Message } from '../../../../../common';
import { TOOL_USE_END, TOOL_USE_START } from './constants';
import { getSystemMessageInstructions } from './get_system_message_instructions';

function replaceFunctionsWithTools(content: string) {
  return content.replaceAll(/(function)(s|[\s*\.])?(?!\scall)/g, (match, p1, p2) => {
    return `tool${p2 || ''}`;
  });
}

export function getMessagesWithSimulatedFunctionCalling({
  messages,
  functions,
  functionCall,
}: {
  messages: Message[];
  functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
  functionCall?: string;
}): Message[] {
  const [systemMessage, ...otherMessages] = messages;

  const instructions = getSystemMessageInstructions({
    functions,
  });

  systemMessage.message.content = (systemMessage.message.content ?? '') + '\n' + instructions;

  return [systemMessage, ...otherMessages]
    .map((message, index) => {
      if (message.message.name) {
        const deserialized = JSON.parse(message.message.content || '{}');

        const results = {
          type: 'tool_result',
          tool: message.message.name,
          ...(message.message.content ? JSON.parse(message.message.content) : {}),
        };

        if ('error' in deserialized) {
          return {
            ...message,
            message: {
              role: message.message.role,
              content: JSON.stringify({
                ...results,
                is_error: true,
              }),
            },
          };
        }

        return {
          ...message,
          message: {
            role: message.message.role,
            content: JSON.stringify(results),
          },
        };
      }

      let content = message.message.content || '';

      if (message.message.function_call?.name) {
        content +=
          TOOL_USE_START +
          '\n```json\n' +
          JSON.stringify({
            name: message.message.function_call.name,
            input: JSON.parse(message.message.function_call.arguments || '{}'),
          }) +
          '\n```' +
          TOOL_USE_END;
      }

      if (index === messages.length - 1 && functionCall) {
        content += `
      
      Remember, use the ${functionCall} tool to answer this question.`;
      }

      return {
        ...message,
        message: {
          role: message.message.role,
          content,
        },
      };
    })
    .map((message) => {
      return {
        ...message,
        message: {
          ...message.message,
          content: message.message.content
            ? replaceFunctionsWithTools(message.message.content)
            : message.message.content,
        },
      };
    });
}
