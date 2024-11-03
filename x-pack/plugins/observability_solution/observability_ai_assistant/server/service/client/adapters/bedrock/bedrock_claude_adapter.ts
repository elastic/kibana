/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, tap } from 'rxjs';
import { createInternalServerError } from '../../../../../common/conversation_complete';
import {
  BedrockChunkMember,
  eventstreamSerdeIntoObservable,
} from '../../../util/eventstream_serde_into_observable';
import { processBedrockStream } from './process_bedrock_stream';
import type { LlmApiAdapterFactory } from '../types';
import { getMessagesWithSimulatedFunctionCalling } from '../simulate_function_calling/get_messages_with_simulated_function_calling';
import { parseInlineFunctionCalls } from '../simulate_function_calling/parse_inline_function_calls';
import { TOOL_USE_END } from '../simulate_function_calling/constants';

// Most of the work here is to re-format OpenAI-compatible functions for Claude.
// See https://github.com/anthropics/anthropic-tools/blob/main/tool_use_package/prompt_constructors.py

export const createBedrockClaudeAdapter: LlmApiAdapterFactory = ({
  messages,
  functions,
  functionCall,
  logger,
}) => {
  const filteredFunctions = functionCall
    ? functions?.filter((fn) => fn.name === functionCall)
    : functions;
  return {
    getSubAction: () => {
      const messagesWithSimulatedFunctionCalling = getMessagesWithSimulatedFunctionCalling({
        messages,
        functions: filteredFunctions,
        functionCall,
      });

      const formattedMessages = messagesWithSimulatedFunctionCalling.map((message) => {
        return {
          role: message.message.role,
          content: message.message.content ?? '',
        };
      });

      return {
        subAction: 'invokeStream',
        subActionParams: {
          messages: formattedMessages,
          temperature: 0,
          stopSequences: ['\n\nHuman:', TOOL_USE_END],
        },
      };
    },
    streamIntoObservable: (readable) =>
      eventstreamSerdeIntoObservable(readable, logger).pipe(
        tap((value) => {
          if ('modelStreamErrorException' in value) {
            throw createInternalServerError(value.modelStreamErrorException.originalMessage);
          }
        }),
        filter((value): value is BedrockChunkMember => {
          return 'chunk' in value && value.chunk?.headers?.[':event-type']?.value === 'chunk';
        }),
        processBedrockStream(),
        parseInlineFunctionCalls({ logger })
      ),
  };
};
