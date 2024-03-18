/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';
import { compact, isEmpty, merge, omit } from 'lodash';
import OpenAI from 'openai';
import { CompatibleJSONSchema } from '../../../../common/functions/types';
import { Message, MessageRole } from '../../../../common';
import { processOpenAiStream } from './process_openai_stream';
import { eventsourceStreamIntoObservable } from '../../util/eventsource_stream_into_observable';
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

export const createOpenAiAdapter: LlmApiAdapterFactory = ({
  messages,
  functions,
  functionCall,
}) => {
  const promptTokens = getOpenAIPromptTokenCount({ messages, functions });

  return {
    getSubAction: () => {
      const messagesForOpenAI: Array<
        Omit<OpenAI.ChatCompletionMessageParam, 'role'> & {
          role: MessageRole;
        }
      > = compact(
        messages
          .filter((message) => message.message.content || message.message.function_call?.name)
          .map((message) => {
            const role =
              message.message.role === MessageRole.Elastic
                ? MessageRole.User
                : message.message.role;

            return {
              role,
              content: message.message.content,
              function_call: isEmpty(message.message.function_call?.name)
                ? undefined
                : omit(message.message.function_call, 'trigger'),
              name: message.message.name,
            };
          })
      );

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

      const request: Omit<OpenAI.ChatCompletionCreateParams, 'model'> & { model?: string } = {
        messages: messagesForOpenAI as OpenAI.ChatCompletionCreateParams['messages'],
        stream: true,
        ...(!!functions?.length ? { functions: functionsForOpenAI } : {}),
        temperature: 0,
        function_call: functionCall ? { name: functionCall } : undefined,
      };

      return {
        subAction: 'stream',
        subActionParams: {
          body: JSON.stringify(request),
          stream: true,
        },
      };
    },
    streamIntoObservable: (readable) => {
      return eventsourceStreamIntoObservable(readable).pipe(processOpenAiStream(promptTokens));
    },
  };
};
