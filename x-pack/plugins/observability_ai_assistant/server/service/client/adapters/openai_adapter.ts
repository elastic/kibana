/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, isEmpty, omit } from 'lodash';
import OpenAI from 'openai';
import { MessageRole } from '../../../../common';
import { processOpenAiStream } from '../../../../common/utils/process_openai_stream';
import { eventsourceStreamIntoObservable } from '../../util/eventsource_stream_into_observable';
import { LlmApiAdapterFactory } from './types';

export const createOpenAiAdapter: LlmApiAdapterFactory = ({
  messages,
  functions,
  functionCall,
  logger,
}) => {
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

      const functionsForOpenAI = functions;

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
      return eventsourceStreamIntoObservable(readable).pipe(processOpenAiStream());
    },
  };
};
