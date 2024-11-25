/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encode } from 'gpt-tokenizer';
import { first, memoize, sum } from 'lodash';
import OpenAI from 'openai';
import { filter, map, Observable, tap } from 'rxjs';
import { v4 } from 'uuid';
import type { Logger } from '@kbn/logging';
import { TokenCountEvent } from '../../../../common/conversation_complete';
import {
  ChatCompletionChunkEvent,
  createInternalServerError,
  createTokenLimitReachedError,
  Message,
  StreamingChatResponseEventType,
} from '../../../../common';

export type CreateChatCompletionResponseChunk = Omit<OpenAI.ChatCompletionChunk, 'choices'> & {
  choices: Array<
    Omit<OpenAI.ChatCompletionChunk.Choice, 'message'> & {
      delta: { content?: string; function_call?: { name?: string; arguments?: string } };
    }
  >;
};

export function processOpenAiStream({
  promptTokenCount,
  logger,
}: {
  promptTokenCount: number;
  logger: Logger;
}) {
  return (source: Observable<string>): Observable<ChatCompletionChunkEvent | TokenCountEvent> => {
    return new Observable<ChatCompletionChunkEvent | TokenCountEvent>((subscriber) => {
      const id = v4();

      let completionTokenCount = 0;

      function emitTokenCountEvent() {
        subscriber.next({
          type: StreamingChatResponseEventType.TokenCount,
          tokens: {
            completion: completionTokenCount,
            prompt: promptTokenCount,
            total: completionTokenCount + promptTokenCount,
          },
        });
      }

      const warnForToolCall = memoize(
        (toolCall: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall) => {
          logger.warn(`More tools than 1 were called: ${JSON.stringify(toolCall)}`);
        },
        (toolCall: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall) =>
          toolCall.index
      );

      const parsed$ = source.pipe(
        filter((line) => !!line && line !== '[DONE]'),
        map(
          (line) =>
            JSON.parse(line) as CreateChatCompletionResponseChunk | { error: { message: string } }
        ),
        tap((line) => {
          if ('error' in line) {
            throw createInternalServerError(line.error.message);
          }
          if (
            'choices' in line &&
            line.choices.length &&
            line.choices[0].finish_reason === 'length'
          ) {
            throw createTokenLimitReachedError();
          }

          const firstChoice = first(line.choices);

          completionTokenCount += sum(
            [
              firstChoice?.delta.content,
              firstChoice?.delta.function_call?.name,
              firstChoice?.delta.function_call?.arguments,
              ...(firstChoice?.delta.tool_calls?.flatMap((toolCall) => {
                return [
                  toolCall.function?.name,
                  toolCall.function?.arguments,
                  toolCall.id,
                  toolCall.index,
                  toolCall.type,
                ];
              }) ?? []),
            ].map((val) => encode(val?.toString() ?? '').length) || 0
          );
        }),
        filter(
          (line): line is CreateChatCompletionResponseChunk =>
            'object' in line && line.object === 'chat.completion.chunk' && line.choices.length > 0
        ),
        map((chunk): ChatCompletionChunkEvent => {
          const delta = chunk.choices[0].delta;
          if (delta.tool_calls && (delta.tool_calls.length > 1 || delta.tool_calls[0].index > 0)) {
            delta.tool_calls.forEach((toolCall) => {
              warnForToolCall(toolCall);
            });
            return {
              id,
              type: StreamingChatResponseEventType.ChatCompletionChunk,
              message: {
                content: delta.content ?? '',
              },
            };
          }

          const functionCall: Omit<Message['message']['function_call'], 'trigger'> | undefined =
            delta.tool_calls
              ? {
                  name: delta.tool_calls[0].function?.name,
                  arguments: delta.tool_calls[0].function?.arguments,
                }
              : delta.function_call;

          return {
            id,
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            message: {
              content: delta.content ?? '',
              function_call: functionCall,
            },
          };
        })
      );

      parsed$.subscribe({
        next: (val) => {
          subscriber.next(val);
        },
        error: (error) => {
          emitTokenCountEvent();
          subscriber.error(error);
        },
        complete: () => {
          emitTokenCountEvent();
          subscriber.complete();
        },
      });
    });
  };
}
