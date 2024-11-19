/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  ChatCompletionEventType,
} from '@kbn/inference-common';
import { generateFakeToolCallId } from '../../../../common';
import type { GenerateContentResponseChunk } from './types';

export function processVertexStream() {
  return (source: Observable<GenerateContentResponseChunk>) =>
    new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>((subscriber) => {
      function handleNext(value: GenerateContentResponseChunk) {
        // completion: only present on last chunk
        if (value.usageMetadata) {
          subscriber.next({
            type: ChatCompletionEventType.ChatCompletionTokenCount,
            tokens: {
              prompt: value.usageMetadata.promptTokenCount,
              completion: value.usageMetadata.candidatesTokenCount,
              total: value.usageMetadata.totalTokenCount,
            },
          });
        }

        const contentPart = value.candidates?.[0].content.parts[0];
        const completion = contentPart?.text;
        const toolCall = contentPart?.functionCall;

        if (completion || toolCall) {
          subscriber.next({
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: completion ?? '',
            tool_calls: toolCall
              ? [
                  {
                    index: 0,
                    toolCallId: generateFakeToolCallId(),
                    function: { name: toolCall.name, arguments: JSON.stringify(toolCall.args) },
                  },
                ]
              : [],
          });
        }
      }

      source.subscribe({
        next: (value) => {
          try {
            handleNext(value);
          } catch (error) {
            subscriber.error(error);
          }
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          subscriber.complete();
        },
      });
    });
}
