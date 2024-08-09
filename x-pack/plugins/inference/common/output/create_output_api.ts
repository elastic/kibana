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

export function createOutputApi(chatCompleteApi: ChatCompleteAPI): OutputAPI {
  return (id, { connectorId, input, schema, system }) => {
    return chatCompleteApi({
      connectorId,
      system,
      messages: [
        {
          role: MessageRole.User,
          content: input,
        },
      ],
      ...(schema
        ? {
            tools: { output: { description: `Output your response in the this format`, schema } },
            toolChoice: { function: 'output' },
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
          output: event.toolCalls[0].function.arguments,
        };
      })
    );
  };
}
