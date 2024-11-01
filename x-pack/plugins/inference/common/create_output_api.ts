/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs';
import {
  OutputAPI,
  OutputEvent,
  OutputEventType,
  ChatCompleteAPI,
  ChatCompletionEventType,
  ChatCompleteStreamResponse,
  ChatCompleteResponse,
  MessageRole,
  withoutTokenCountEvents,
  ToolSchema,
  OutputOptions,
  OutputCompositeResponse,
} from '@kbn/inference-common';
import { ensureMultiTurn } from './utils/ensure_multi_turn';

export function createOutputApi(chatCompleteApi: ChatCompleteAPI): OutputAPI {
  return <
    TId extends string = string,
    TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined,
    TStream extends boolean = false
  >({
    id,
    connectorId,
    input,
    schema,
    system,
    previousMessages,
    functionCalling,
    stream,
  }: OutputOptions<TId, TOutputSchema, TStream>) => {
    const response = chatCompleteApi({
      connectorId,
      stream,
      functionCalling,
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
              structuredOutput: {
                description: `Use the following schema to respond to the user's request in structured data, so it can be parsed and handled.`,
                schema,
              },
            },
            toolChoice: { function: 'structuredOutput' as const },
          }
        : {}),
    });

    if (stream) {
      return (response as ChatCompleteStreamResponse).pipe(
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
      ) as OutputCompositeResponse<TId, TOutputSchema, TStream>;
    } else {
      return (response as Promise<ChatCompleteResponse>).then((chatResponse) => {
        return {
          id,
          content: chatResponse.content,
          output:
            chatResponse.toolCalls.length && 'arguments' in chatResponse.toolCalls[0].function
              ? chatResponse.toolCalls[0].function.arguments
              : undefined,
        };
      }) as OutputCompositeResponse<TId, TOutputSchema, TStream>;
    }
  };
}
