/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import OpenAI from 'openai';
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import { filter, from, map, switchMap, tap } from 'rxjs';
import { Readable } from 'stream';
import {
  ChatCompletionChunkEvent,
  ChatCompletionEventType,
  Message,
  MessageRole,
} from '../../../../common/chat_complete';
import { createTokenLimitReachedError } from '../../../../common/chat_complete/errors';
import { createInferenceInternalError } from '../../../../common/errors';
import { InferenceConnectorAdapter } from '../../types';
import { eventSourceStreamIntoObservable } from '../event_source_stream_into_observable';

export const openAIAdapter: InferenceConnectorAdapter = {
  chatComplete: ({ connector, actionsClient, system, messages, toolChoice, tools }) => {
    const openAIMessages = messagesToOpenAI({ system, messages });

    const toolChoiceForOpenAI =
      typeof toolChoice === 'string'
        ? toolChoice
        : toolChoice
        ? {
            function: {
              name: toolChoice.function,
            },
            type: 'function' as const,
          }
        : undefined;

    const stream = true;

    const request: Omit<OpenAI.ChatCompletionCreateParams, 'model'> & { model?: string } = {
      stream,
      messages: openAIMessages,
      temperature: 0,
      tool_choice: toolChoiceForOpenAI,
      tools: tools
        ? Object.entries(tools).map(([toolName, { description, schema }]) => {
            return {
              type: 'function',
              function: {
                name: toolName,
                description,
                parameters: (schema ?? {
                  type: 'object' as const,
                  properties: {},
                }) as unknown as Record<string, unknown>,
              },
            };
          })
        : undefined,
    };

    return from(
      actionsClient.execute({
        actionId: connector.id,
        params: {
          subAction: 'stream',
          subActionParams: {
            body: JSON.stringify(request),
            stream,
          },
        },
      })
    ).pipe(
      switchMap((response) => {
        const readable = response.data as Readable;
        return eventSourceStreamIntoObservable(readable);
      }),
      filter((line) => !!line && line !== '[DONE]'),
      map(
        (line) => JSON.parse(line) as OpenAI.ChatCompletionChunk | { error: { message: string } }
      ),
      tap((line) => {
        if ('error' in line) {
          throw createInferenceInternalError(line.error.message);
        }
        if (
          'choices' in line &&
          line.choices.length &&
          line.choices[0].finish_reason === 'length'
        ) {
          throw createTokenLimitReachedError();
        }
      }),
      filter(
        (line): line is OpenAI.ChatCompletionChunk =>
          'object' in line && line.object === 'chat.completion.chunk'
      ),
      map((chunk): ChatCompletionChunkEvent => {
        const delta = chunk.choices[0].delta;

        return {
          content: delta.content ?? '',
          tool_calls:
            delta.tool_calls?.map((toolCall) => {
              return {
                function: {
                  name: toolCall.function?.name ?? '',
                  arguments: toolCall.function?.arguments ?? '',
                },
                toolCallId: toolCall.id ?? '',
                index: toolCall.index,
              };
            }) ?? [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        };
      })
    );
  },
};

function messagesToOpenAI({
  system,
  messages,
}: {
  system?: string;
  messages: Message[];
}): OpenAI.ChatCompletionMessageParam[] {
  const systemMessage: ChatCompletionSystemMessageParam | undefined = system
    ? { role: 'system', content: system }
    : undefined;

  return [
    ...(systemMessage ? [systemMessage] : []),
    ...messages.map((message): ChatCompletionMessageParam => {
      const role = message.role;

      switch (role) {
        case MessageRole.Assistant:
          const assistantMessage: ChatCompletionAssistantMessageParam = {
            role: 'assistant',
            content: message.content,
            tool_calls: message.toolCalls?.map((toolCall) => {
              return {
                function: {
                  name: toolCall.function.name,
                  arguments:
                    'arguments' in toolCall.function
                      ? JSON.stringify(toolCall.function.arguments)
                      : '{}',
                },
                id: toolCall.toolCallId,
                type: 'function',
              };
            }),
          };
          return assistantMessage;

        case MessageRole.User:
          const userMessage: ChatCompletionUserMessageParam = {
            role: 'user',
            content: message.content,
          };
          return userMessage;

        case MessageRole.Tool:
          const toolMessage: ChatCompletionToolMessageParam = {
            role: 'tool',
            content: JSON.stringify(message.response),
            tool_call_id: message.toolCallId,
          };
          return toolMessage;
      }
    }),
  ];
}
