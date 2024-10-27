/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, map, Observable, throwError } from 'rxjs';
import {
  ChatCompleteAPI,
  ChatCompletionEvent,
  ChatCompletionEventType,
  Message,
  MessageRole,
} from '../chat_complete';
import { withoutTokenCountEvents } from '../chat_complete/without_token_count_events';
import { OutputAPI, OutputEvent, OutputEventType } from '.';
import { ensureMultiTurn } from '../ensure_multi_turn';
import { isToolValidationError } from '../chat_complete/errors';

export function createOutputApi(chatCompleteApi: ChatCompleteAPI): OutputAPI {
  return (id, { connectorId, input, schema, system, previousMessages, functionCalling, retry }) => {
    const retryOnValidationError = retry?.onValidationError !== false;

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
          if (isToolValidationError(error) && retryOnValidationError) {
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
      map((event): OutputEvent<any, any> => {
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
