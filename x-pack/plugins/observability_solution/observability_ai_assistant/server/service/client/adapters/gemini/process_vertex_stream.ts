/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { v4 } from 'uuid';
import {
  ChatCompletionChunkEvent,
  StreamingChatResponseEventType,
  TokenCountEvent,
} from '../../../../../common/conversation_complete';
import type { GoogleGenerateContentResponseChunk } from './types';

export function processVertexStream() {
  return (source: Observable<GoogleGenerateContentResponseChunk>) =>
    new Observable<ChatCompletionChunkEvent | TokenCountEvent>((subscriber) => {
      const id = v4();

      function handleNext(value: GoogleGenerateContentResponseChunk) {
        // completion: what we eventually want to emit
        if (value.usageMetadata) {
          subscriber.next({
            type: StreamingChatResponseEventType.TokenCount,
            tokens: {
              prompt: value.usageMetadata.promptTokenCount,
              completion: value.usageMetadata.candidatesTokenCount,
              total: value.usageMetadata.totalTokenCount,
            },
          });
        }

        const completion = value.candidates[0].content.parts[0].text;

        if (completion) {
          subscriber.next({
            id,
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            message: {
              content: completion,
            },
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
