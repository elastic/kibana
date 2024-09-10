/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs';
import { ChatCompleteAPI, ChatCompletionEventType, MessageRole } from '../chat_complete';
import { withoutTokenCountEvents } from '../chat_complete/without_token_count_events';
import { OutputAPI, OutputEvent, OutputEventType } from '.';
import { ensureMultiTurn } from '../ensure_multi_turn';

export function createOutputApi(chatCompleteApi: ChatCompleteAPI): OutputAPI {
  return (id, { connectorId, input, schema, system, previousMessages }) => {
    return chatCompleteApi({
      connectorId,
      system,
      messages: ensureMultiTurn([
        ...(previousMessages || []),
        {
          role: MessageRole.User,
          content: input,
        },
      ]),
      ...(schema
        ? {
            tools: {
              output: {
                description: `Use the following schema to respond to the user's request in structured data, so it can be parsed and handled.`,
                schema,
              },
            },
            toolChoice: { function: 'output' as const },
          }
        : {}),
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
          type: OutputEventType.OutputComplete,
          output:
            event.toolCalls.length && 'arguments' in event.toolCalls[0].function
              ? event.toolCalls[0].function.arguments
              : undefined,
          content: event.content,
        };
      })
    );
  };
}
