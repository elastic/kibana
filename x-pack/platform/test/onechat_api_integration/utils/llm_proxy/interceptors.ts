/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { last } from 'lodash';
import type { LlmProxy, ToolMessage } from '.';

type LLMMessage = string[] | ToolMessage | string | undefined;
type LLMResponseFnOrString = LLMMessage | ((body: ChatCompletionStreamParams) => LLMMessage);

export function createInterceptors(proxy: LlmProxy) {
  return {
    toolChoice: ({ name, response }: { name: string; response: LLMResponseFnOrString }) =>
      proxy
        .intercept({
          name: `toolChoice: "${name}"`,
          // @ts-expect-error
          when: (body) => body.tool_choice?.function?.name === name,
          responseMock: response,
        })
        .completeAfterIntercept(),

    userMessage: ({
      response,
      when,
    }: {
      response: LLMResponseFnOrString;
      when?: (body: ChatCompletionStreamParams) => boolean;
    }) =>
      proxy
        .intercept({
          name: `userMessage`,
          when: (body) => {
            const isUserMessage = last(body.messages)?.role === 'user';
            if (when) {
              return isUserMessage && when(body);
            }
            return isUserMessage;
          },
          responseMock: response,
        })
        .completeAfterIntercept(),

    toolMessage: ({
      response,
      when,
    }: {
      response: LLMResponseFnOrString;
      when?: (body: ChatCompletionStreamParams) => boolean;
    }) =>
      proxy
        .intercept({
          name: `toolMessage`,
          when: (body) => {
            const isToolMessage = last(body.messages)?.role === 'tool';
            if (when) {
              return isToolMessage && when(body);
            }
            return isToolMessage;
          },
          responseMock: response,
        })
        .completeAfterIntercept(),
  };
}
