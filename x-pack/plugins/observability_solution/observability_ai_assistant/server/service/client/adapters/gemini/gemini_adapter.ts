/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs';
import { processVertexStream } from './process_vertex_stream';
import type { LlmApiAdapterFactory } from '../types';
import { getMessagesWithSimulatedFunctionCalling } from '../simulate_function_calling/get_messages_with_simulated_function_calling';
import { parseInlineFunctionCalls } from '../simulate_function_calling/parse_inline_function_calls';
import { TOOL_USE_END } from '../simulate_function_calling/constants';
import { eventsourceStreamIntoObservable } from '../../../util/eventsource_stream_into_observable';
import { GoogleGenerateContentResponseChunk } from './types';

export const createGeminiAdapter: LlmApiAdapterFactory = ({
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
      eventsourceStreamIntoObservable(readable).pipe(
        map((value) => {
          const response = JSON.parse(value) as GoogleGenerateContentResponseChunk;
          return response;
        }),
        processVertexStream(),
        parseInlineFunctionCalls({ logger })
      ),
  };
};
