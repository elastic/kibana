/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last, map, merge, OperatorFunction, scan, share } from 'rxjs';
import type { UnvalidatedToolCall, ToolOptions } from '../../../common/chat_complete/tools';
import {
  ChatCompletionChunkEvent,
  ChatCompletionEventType,
  ChatCompletionMessageEvent,
  ChatCompletionTokenCountEvent,
} from '../../../common/chat_complete';
import { withoutTokenCountEvents } from '../../../common/chat_complete/without_token_count_events';
import { validateToolCalls } from '../../util/validate_tool_calls';

export function chunksIntoMessage<TToolOptions extends ToolOptions>(
  toolOptions: TToolOptions
): OperatorFunction<
  ChatCompletionChunkEvent | ChatCompletionTokenCountEvent,
  | ChatCompletionChunkEvent
  | ChatCompletionTokenCountEvent
  | ChatCompletionMessageEvent<TToolOptions>
> {
  return (chunks$) => {
    const shared$ = chunks$.pipe(share());

    return merge(
      shared$,
      shared$.pipe(
        withoutTokenCountEvents(),
        scan(
          (prev, chunk) => {
            prev.content += chunk.content ?? '';

            chunk.tool_calls?.forEach((toolCall) => {
              let prevToolCall = prev.tool_calls[toolCall.index];
              if (!prevToolCall) {
                prev.tool_calls[toolCall.index] = {
                  function: {
                    name: '',
                    arguments: '',
                  },
                  toolCallId: '',
                };

                prevToolCall = prev.tool_calls[toolCall.index];
              }

              prevToolCall.function.name += toolCall.function.name;
              prevToolCall.function.arguments += toolCall.function.arguments;
              prevToolCall.toolCallId += toolCall.toolCallId;
            });

            return prev;
          },
          {
            content: '',
            tool_calls: [] as UnvalidatedToolCall[],
          }
        ),
        last(),
        map((concatenatedChunk): ChatCompletionMessageEvent<TToolOptions> => {
          const validatedToolCalls = validateToolCalls<TToolOptions>({
            ...toolOptions,
            toolCalls: concatenatedChunk.tool_calls,
          });

          return {
            type: ChatCompletionEventType.ChatCompletionMessage,
            content: concatenatedChunk.content,
            toolCalls: validatedToolCalls,
          };
        })
      )
    );
  };
}
