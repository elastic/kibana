/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, last, map, Observable, of, tap } from 'rxjs';
import { Logger } from '@kbn/logging';
import type { ObservabilityAIAssistantClient } from '..';
import { Message, MessageRole } from '../../../../common';
import { concatenateChatCompletionChunks } from '../../../../common/utils/concatenate_chat_completion_chunks';
import { hideTokenCountEvents } from './hide_token_count_events';
import { ChatEvent, TokenCountEvent } from '../../../../common/conversation_complete';
import { LangTracer } from '../instrumentation/lang_tracer';

type ChatFunctionWithoutConnectorAndTokenCount = (
  name: string,
  params: Omit<
    Parameters<ObservabilityAIAssistantClient['chat']>[1],
    'connectorId' | 'signal' | 'simulateFunctionCalling'
  >
) => Observable<ChatEvent>;

export function getGeneratedTitle({
  responseLanguage,
  messages,
  chat,
  logger,
  tracer,
}: {
  responseLanguage?: string;
  messages: Message[];
  chat: ChatFunctionWithoutConnectorAndTokenCount;
  logger: Pick<Logger, 'debug' | 'error'>;
  tracer: LangTracer;
}): Observable<string | TokenCountEvent> {
  return hideTokenCountEvents((hide) =>
    chat('generate_title', {
      messages: [
        {
          '@timestamp': new Date().toString(),
          message: {
            role: MessageRole.System,
            content: `You are a helpful assistant for Elastic Observability. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you. Please create the title in ${responseLanguage}.`,
          },
        },
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: messages
              .filter((msg) => msg.message.role !== MessageRole.System)
              .reduce((acc, curr) => {
                return `${acc} ${curr.message.role}: ${curr.message.content}`;
              }, 'Generate a title, using the title_conversation_function, based on the following conversation:\n\n'),
          },
        },
      ],
      functions: [
        {
          name: 'title_conversation',
          description:
            'Use this function to title the conversation. Do not wrap the title in quotes',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
              },
            },
            required: ['title'],
          },
        },
      ],
      functionCall: 'title_conversation',
      tracer,
    }).pipe(
      hide(),
      concatenateChatCompletionChunks(),
      last(),
      map((concatenatedMessage) => {
        const title: string =
          (concatenatedMessage.message.function_call.name
            ? JSON.parse(concatenatedMessage.message.function_call.arguments).title
            : concatenatedMessage.message?.content) || '';

        // This captures a string enclosed in single or double quotes.
        // It extracts the string content without the quotes.
        // Example matches:
        // - "Hello, World!" => Captures: Hello, World!
        // - 'Another Example' => Captures: Another Example
        // - JustTextWithoutQuotes => Captures: JustTextWithoutQuotes

        return title.replace(/^"(.*)"$/g, '$1').replace(/^'(.*)'$/g, '$1');
      }),
      tap((event) => {
        if (typeof event === 'string') {
          logger.debug(`Generated title: ${event}`);
        }
      })
    )
  ).pipe(
    catchError((error) => {
      logger.error(`Error generating title`);
      logger.error(error);
      // TODO: i18n
      return of('New conversation');
    })
  );
}
