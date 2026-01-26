/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BufferFlushEvent,
  ChatCompletionErrorEvent,
  ConversationCreateEvent,
  MessageAddEvent,
  StreamingChatResponseEvent,
} from '@kbn/observability-ai-assistant-plugin/common';
import {
  ChatCompletionErrorCode,
  StreamingChatResponseEventType,
  isChatCompletionError,
} from '@kbn/observability-ai-assistant-plugin/common';
import type { Observable, OperatorFunction } from 'rxjs';
import {
  catchError,
  concatMap,
  defer,
  filter,
  from,
  lastValueFrom,
  of,
  retry,
  switchMap,
  throwError,
  timer,
  toArray,
} from 'rxjs';
import { throwSerializedChatCompletionErrors } from '@kbn/observability-ai-assistant-plugin/common/utils/throw_serialized_chat_completion_errors';
import type { ToolingLog } from '@kbn/tooling-log';
import { isAxiosError } from 'axios';
import { inspect } from 'util';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common/types';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common/types';
import type { HttpHandler } from '@kbn/core/public';
import { streamIntoObservable } from '@kbn/observability-ai-assistant-plugin/server';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { ChatClient, ConverseParams, ConverseResponse } from './types';

function serializeAndHandleRetryableErrors<T extends StreamingChatResponseEvent>(
  log: ToolingLog
): OperatorFunction<Buffer, Exclude<T, ChatCompletionErrorEvent>> {
  return (source$) => {
    const processed$ = source$.pipe(
      concatMap((buffer: Buffer) =>
        buffer
          .toString('utf-8')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line) as T | BufferFlushEvent)
      ),
      throwSerializedChatCompletionErrors(),
      retry({
        count: 1,
        delay: (error) => {
          if (
            isChatCompletionError(error) &&
            error.code !== ChatCompletionErrorCode.InternalError
          ) {
            log.info(`Not retrying error ${error.code}`);
            return throwError(() => error);
          }

          let status: number = 0;

          if (isAxiosError(error)) {
            status = error.status ?? 0;
          } else if (isHttpFetchError(error)) {
            status = error.response?.status ?? 0;
          }

          if (status === 404 || status === 400) {
            return throwError(() => error);
          }

          log.info('Caught retryable error');

          if (isAxiosError(error)) {
            log.error(
              inspect(
                {
                  message: error.message,
                  status: error.status,
                },
                { depth: 10 }
              )
            );
          } else {
            log.error(inspect(error, { depth: 5 }));
          }

          if (error.message.includes('Status code: 429')) {
            log.info(`429, backing off 30s`);
            return timer(30000);
          }

          log.info(`Retrying in 5s`);
          return timer(2500);
        },
      }),
      filter(
        (event): event is Exclude<T, ChatCompletionErrorEvent> =>
          event.type !== StreamingChatResponseEventType.BufferFlush
      )
    );

    return processed$;
  };
}

function normalizeMessages(message: string | Array<Message['message']>): Array<Message['message']> {
  if (typeof message === 'string') {
    return [
      {
        content: message,
        role: MessageRole.User,
      },
    ];
  }
  return message;
}

export class ObservabilityAIAssistantEvaluationChatClient implements ChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async converse(params: ConverseParams): Promise<ConverseResponse> {
    const { messages: messagesArg, conversationId, options = {}, scope } = params;
    this.log.info('Calling converse');

    const messages = [
      ...normalizeMessages(messagesArg).map((msg) => ({
        message: msg,
        '@timestamp': new Date().toISOString(),
      })),
    ];

    const stream$ = defer(() => {
      this.log.info(`Calling /chat/complete API`);
      return from(
        this.fetch('/internal/observability_ai_assistant/chat/complete', {
          method: 'POST',
          body: JSON.stringify({
            screenContexts: options?.screenContexts || [],
            conversationId,
            messages,
            connectorId: this.connectorId,
            persist: false,
            scopes: scope ? [scope] : ['observability'],
          }),
          asResponse: true,
          rawResponse: true,
        })
      );
    }).pipe(
      switchMap((response) => {
        const reader = response.response?.body?.getReader()!;

        const decoder = new TextDecoder();

        // @ts-expect-error upgrade typescript v5.9.3
        const iterator: NodeJS.AsyncIterator<string> = {
          async next() {
            const { done, value } = await reader.read();

            if (done) {
              const tail = decoder.decode(undefined, { stream: false });
              return { value: tail || undefined, done: true };
            }

            const text = decoder.decode(value, { stream: true });
            return { value: text, done: false };
          },
          [Symbol.asyncIterator]() {
            return this;
          },
        };

        return streamIntoObservable(iterator);
      }),
      serializeAndHandleRetryableErrors(this.log),
      catchError((error): Observable<ChatCompletionErrorEvent> => {
        const errorEvent: ChatCompletionErrorEvent = {
          error: {
            message: error.message,
            stack: error.stack,
            code: isChatCompletionError(error) ? error.code : undefined,
            meta: error.meta,
          },
          type: StreamingChatResponseEventType.ChatCompletionError,
        };

        this.log.error('Error in stream');
        this.log.error(JSON.stringify(error));

        return of(errorEvent);
      }),
      filter(
        (event): event is MessageAddEvent | ConversationCreateEvent | ChatCompletionErrorEvent =>
          event.type === StreamingChatResponseEventType.MessageAdd ||
          event.type === StreamingChatResponseEventType.ConversationCreate ||
          event.type === StreamingChatResponseEventType.ChatCompletionError
      ),
      toArray()
    );

    const events = await lastValueFrom(stream$);

    const messagesWithAdded = messages
      .map((msg) => msg.message)
      .concat(
        events
          .filter(
            (event): event is MessageAddEvent =>
              event.type === StreamingChatResponseEventType.MessageAdd
          )
          .map((event) => event.message.message)
      );

    return {
      conversationId:
        conversationId ||
        events.find(
          (event): event is ConversationCreateEvent =>
            event.type === StreamingChatResponseEventType.ConversationCreate
        )?.conversation.id,
      messages: messagesWithAdded.map((msg) => ({
        content: msg.content ?? '',
        role: msg.role,
        function_call: msg.function_call,
      })),
      errors: events.filter(
        (event): event is ChatCompletionErrorEvent =>
          event.type === StreamingChatResponseEventType.ChatCompletionError
      ),
    };
  }
}
