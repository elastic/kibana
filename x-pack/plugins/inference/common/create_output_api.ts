/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, catchError, map, throwError } from 'rxjs';
import {
  OutputAPI,
  OutputEvent,
  OutputEventType,
  ChatCompleteAPI,
  ChatCompletionEventType,
  MessageRole,
  withoutTokenCountEvents,
  Message,
  ChatCompletionEvent,
  isToolValidationError,
} from '@kbn/inference-common';
import { ensureMultiTurn } from './utils/ensure_multi_turn';

export function createOutputApi(chatCompleteApi: ChatCompleteAPI): OutputAPI;

export function createOutputApi(chatCompleteApi: ChatCompleteAPI) {
  return (
    id: string,
    {
      connectorId,
      input,
      schema,
      system,
      previousMessages,
      functionCalling,
      retry,
    }: Parameters<OutputAPI>[1]
  ) => {
    let retriesOnValidationErrorLeft = retry?.onValidationError
      ? Number(retry?.onValidationError)
      : 0;

    function callChatCompleteApi({
      messages,
    }: {
      messages: Message[];
    }): Observable<ChatCompletionEvent> {
      return chatCompleteApi({
        connectorId,
        system,
        functionCalling,
        messages,
        ...(schema
          ? {
              tools: {
                structuredOutput: {
                  description: `Use the following schema to respond to the user's request in structured data, so it can be parsed and handled.`,
                  schema,
                },
              },
              toolChoice: { function: 'structuredOutput' as const },
            }
          : {}),
      }).pipe(
        catchError((error) => {
          if (isToolValidationError(error) && retriesOnValidationErrorLeft >= 1) {
            retriesOnValidationErrorLeft--;

            return callChatCompleteApi({
              messages: messages.concat(
                {
                  role: MessageRole.Assistant as const,
                  content: '',
                  toolCalls: error.meta.toolCalls!,
                },
                ...(error.meta.toolCalls?.map((toolCall) => {
                  return {
                    name: toolCall.function.name,
                    role: MessageRole.Tool as const,
                    toolCallId: toolCall.toolCallId,
                    response: {
                      error: error.meta,
                    },
                  };
                }) ?? [])
              ),
            });
          }
          return throwError(() => error);
        })
      );
    }

    return callChatCompleteApi({
      messages: ensureMultiTurn([
        ...(previousMessages || []),
        {
          role: MessageRole.User,
          content: input,
        },
      ]),
    }).pipe(
      withoutTokenCountEvents(),
      map((event): OutputEvent => {
        if (event.type === ChatCompletionEventType.ChatCompletionChunk) {
          return {
            type: OutputEventType.OutputUpdate,
            id,
            content: event.content,
          };
        }

        return {
          id,
          output:
            event.toolCalls.length && 'arguments' in event.toolCalls[0].function
              ? event.toolCalls[0].function.arguments
              : undefined,
          content: event.content,
          type: OutputEventType.OutputComplete,
        };
      })
    );
  };
}
