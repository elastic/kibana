/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';
import { merge, pick } from 'lodash';
import OpenAI from 'openai';
import { identity } from 'rxjs';
import { v4 } from 'uuid';
import { Message, MessageRole } from '../../../../common';
import { CompatibleJSONSchema } from '../../../../common/functions/types';
import { eventsourceStreamIntoObservable } from '../../util/eventsource_stream_into_observable';
import { processOpenAiStream } from './process_openai_stream';
import { getMessagesWithSimulatedFunctionCalling } from './simulate_function_calling/get_messages_with_simulated_function_calling';
import { parseInlineFunctionCalls } from './simulate_function_calling/parse_inline_function_calls';
import { LlmApiAdapterFactory } from './types';

function getOpenAIPromptTokenCount({
  messages,
  functions,
}: {
  messages: Message[];
  functions?: Array<{ name: string; description: string; parameters?: CompatibleJSONSchema }>;
}) {
  // per https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  const tokensFromMessages = encode(
    messages
      .map(
        ({ message }) =>
          `<|start|>${message.role}\n${message.content}\n${
            'name' in message
              ? message.name
              : 'function_call' in message && message.function_call
              ? message.function_call.name + '\n' + message.function_call.arguments
              : ''
          }<|end|>`
      )
      .join('\n')
  ).length;

  // this is an approximation. OpenAI cuts off a function schema
  // at a certain level of nesting, so their token count might
  // be lower than what we are calculating here.
  const tokensFromFunctions = functions
    ? encode(
        functions
          ?.map(
            (fn) =>
              `<|start|>${fn.name}\n${fn.description}\n${JSON.stringify(fn.parameters)}<|end|>`
          )
          .join('\n')
      ).length
    : 0;

  return tokensFromMessages + tokensFromFunctions;
}

function getOpenAiMessage(
  message: Message,
  previousOpenAIMessage?: OpenAI.ChatCompletionMessageParam
): OpenAI.ChatCompletionMessageParam {
  if (message.message.role === MessageRole.System) {
    return {
      role: 'system',
      content: message.message.content || '',
    };
  }

  if (message.message.role === MessageRole.Assistant) {
    return {
      role: 'assistant',
      content: message.message.content,
      ...(message.message.function_call?.name
        ? {
            tool_calls: [
              {
                id: v4().substr(0, 6),
                type: 'function',
                function: {
                  name: message.message.function_call!.name,
                  arguments: message.message.function_call!.arguments || '',
                },
              },
            ],
          }
        : {}),
    };
  }

  if (message.message.name) {
    if (
      !previousOpenAIMessage ||
      !('tool_calls' in previousOpenAIMessage) ||
      !previousOpenAIMessage.tool_calls?.[0].id
    ) {
      throw new Error('Could not find tool call id in previous message for function response');
    }

    const prevToolCallId = previousOpenAIMessage.tool_calls[0].id;
    return {
      role: 'tool',
      content: message.message.content || '',
      tool_call_id: prevToolCallId,
    };
  }

  return {
    role: 'user',
    content: message.message.content || '',
  };
}

function messagesToOpenAI(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  const messagesWithSomething = messages.filter(
    (message) => message.message.content || message.message.function_call?.name
  );

  const messagesForOpenAI: OpenAI.ChatCompletionMessageParam[] = [];

  messagesWithSomething.forEach((message, index) => {
    messagesForOpenAI.push(getOpenAiMessage(message, messagesForOpenAI[index - 1]));
  });

  return messagesForOpenAI;
}

export const createOpenAiAdapter: LlmApiAdapterFactory = ({
  messages,
  functions,
  functionCall,
  logger,
  simulateFunctionCalling,
}) => {
  const promptTokens = getOpenAIPromptTokenCount({ messages, functions });

  return {
    getSubAction: () => {
      const functionsForOpenAI = functions?.map((fn) => ({
        ...fn,
        parameters: merge(
          {
            type: 'object',
            properties: {},
          },
          fn.parameters
        ),
      }));

      let request: Omit<OpenAI.ChatCompletionCreateParams, 'model'> & { model?: string };

      if (simulateFunctionCalling) {
        request = {
          messages: messagesToOpenAI(
            getMessagesWithSimulatedFunctionCalling({
              messages,
              functions: functionsForOpenAI,
              functionCall,
            })
          ),
          stream: true,
          temperature: 0,
        };
      } else {
        request = {
          messages: messagesToOpenAI(messages),
          stream: true,
          ...(!!functionsForOpenAI?.length
            ? {
                tools: functionsForOpenAI.map((fn) => ({
                  function: pick(fn, 'name', 'description', 'parameters'),
                  type: 'function',
                })),
              }
            : {}),
          temperature: 0,
          tool_choice: functionCall
            ? { function: { name: functionCall }, type: 'function' }
            : undefined,
        };
      }

      return {
        subAction: 'stream',
        subActionParams: {
          body: JSON.stringify(request),
          stream: true,
        },
      };
    },
    streamIntoObservable: (readable) => {
      return eventsourceStreamIntoObservable(readable).pipe(
        processOpenAiStream({ promptTokenCount: promptTokens, logger }),
        simulateFunctionCalling
          ? parseInlineFunctionCalls({
              logger,
            })
          : identity
      );
    },
  };
};
