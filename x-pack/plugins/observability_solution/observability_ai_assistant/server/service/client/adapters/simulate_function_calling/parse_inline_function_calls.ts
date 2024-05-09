/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { Logger } from '@kbn/logging';
import {
  ChatCompletionChunkEvent,
  createInternalServerError,
  StreamingChatResponseEventType,
} from '../../../../../common';
import { TokenCountEvent } from '../../../../../common/conversation_complete';
import { TOOL_USE_END, TOOL_USE_START } from './constants';

function matchOnSignalStart(buffer: string) {
  if (buffer.includes(TOOL_USE_START)) {
    const split = buffer.split(TOOL_USE_START);
    return [split[0], TOOL_USE_START + split[1]];
  }

  for (let i = 0; i < buffer.length; i++) {
    const remaining = buffer.substring(i);
    if (TOOL_USE_START.startsWith(remaining)) {
      return [buffer.substring(0, i), remaining];
    }
  }

  return false;
}

export function parseInlineFunctionCalls({ logger }: { logger: Logger }) {
  return (source: Observable<ChatCompletionChunkEvent | TokenCountEvent>) => {
    let functionCallBuffer: string = '';

    // As soon as we see a TOOL_USE_START token, we write all chunks
    // to a buffer, that we flush as a function request if we
    // spot the stop sequence.

    return new Observable<ChatCompletionChunkEvent | TokenCountEvent>((subscriber) => {
      function parseFunctionCall(id: string, buffer: string) {
        logger.debug('Parsing function call:\n' + buffer);

        const match = buffer.match(
          /<\|tool_use_start\|>\s*```json\n?(.*?)(\n```\s*).*<\|tool_use_end\|>/s
        );

        const functionCallBody = match?.[1];

        if (!functionCallBody) {
          throw createInternalServerError(`Invalid function call syntax`);
        }

        const parsedFunctionCall = JSON.parse(functionCallBody) as {
          name?: string;
          input?: unknown;
        };

        logger.debug('Parsed function call:\n ' + JSON.stringify(parsedFunctionCall));

        if (!parsedFunctionCall.name) {
          throw createInternalServerError(`Missing name for tool use`);
        }

        subscriber.next({
          id,
          message: {
            content: '',
            function_call: {
              name: parsedFunctionCall.name,
              arguments: JSON.stringify(parsedFunctionCall.input || {}),
            },
          },
          type: StreamingChatResponseEventType.ChatCompletionChunk,
        });
      }

      source.subscribe({
        next: (event) => {
          if (event.type === StreamingChatResponseEventType.TokenCount) {
            subscriber.next(event);
            return;
          }

          const { type, id, message } = event;

          function next(content: string) {
            subscriber.next({
              id,
              type,
              message: {
                ...message,
                content,
              },
            });
          }

          const content = message.content ?? '';

          const match = matchOnSignalStart(functionCallBuffer + content);

          if (match) {
            const [beforeStartSignal, afterStartSignal] = match;
            functionCallBuffer = afterStartSignal;
            if (beforeStartSignal) {
              next(beforeStartSignal);
            }

            if (functionCallBuffer.includes(TOOL_USE_END)) {
              const [beforeEndSignal, afterEndSignal] = functionCallBuffer.split(TOOL_USE_END);

              try {
                parseFunctionCall(id, beforeEndSignal + TOOL_USE_END);
                functionCallBuffer = '';
                next(afterEndSignal);
              } catch (error) {
                subscriber.error(error);
              }
            }
          } else {
            functionCallBuffer = '';
            next(content);
          }
        },
        complete: () => {
          subscriber.complete();
        },
        error: (error) => {
          subscriber.error(error);
        },
      });
    });
  };
}
