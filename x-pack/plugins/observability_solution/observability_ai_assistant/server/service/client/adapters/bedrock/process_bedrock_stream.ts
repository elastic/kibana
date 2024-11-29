/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscriber } from 'rxjs';
import { v4 } from 'uuid';
import {
  ChatCompletionChunkEvent,
  StreamingChatResponseEventType,
  TokenCountEvent,
} from '../../../../../common/conversation_complete';
import type { BedrockChunkMember } from '../../../util/eventstream_serde_into_observable';
import { parseSerdeChunkBody } from './parse_serde_chunk_body';
import type {
  CompletionChunk,
  ContentBlockDeltaChunk,
  ContentBlockStartChunk,
  MessageStopChunk,
} from './types';

export function processBedrockStream() {
  return (source: Observable<BedrockChunkMember>) =>
    new Observable<ChatCompletionChunkEvent | TokenCountEvent>((subscriber) => {
      const id = v4();

      // We use this to make sure we don't complete the Observable
      // before all operations have completed.
      let nextPromise = Promise.resolve();

      // As soon as we see a `<function` token, we write all chunks
      // to a buffer, that we flush as a function request if we
      // spot the stop sequence.

      async function handleNext(value: BedrockChunkMember) {
        const chunkBody: CompletionChunk = parseSerdeChunkBody(value.chunk);

        if (isTokenCountCompletionChunk(chunkBody)) {
          return emitTokenCountEvent(subscriber, chunkBody);
        }

        if (
          chunkBody.type !== 'content_block_start' &&
          chunkBody.type !== 'content_block_delta' &&
          chunkBody.type !== 'message_delta'
        ) {
          return;
        }

        // completion: what we eventually want to emit
        const completion =
          chunkBody.type !== 'message_delta'
            ? getCompletion(chunkBody)
            : chunkBody.delta.stop_sequence || '';

        subscriber.next({
          id,
          type: StreamingChatResponseEventType.ChatCompletionChunk,
          message: {
            content: completion,
          },
        });
      }

      source.subscribe({
        next: (value) => {
          nextPromise = nextPromise.then(() =>
            handleNext(value).catch((error) => subscriber.error(error))
          );
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          nextPromise.then(() => subscriber.complete()).catch(() => {});
        },
      });
    });
}

function isTokenCountCompletionChunk(value: any): value is MessageStopChunk {
  return value.type === 'message_stop' && 'amazon-bedrock-invocationMetrics' in value;
}

function emitTokenCountEvent(
  subscriber: Subscriber<ChatCompletionChunkEvent | TokenCountEvent>,
  chunk: MessageStopChunk
) {
  const { inputTokenCount, outputTokenCount } = chunk['amazon-bedrock-invocationMetrics'];

  subscriber.next({
    type: StreamingChatResponseEventType.TokenCount,
    tokens: {
      completion: outputTokenCount,
      prompt: inputTokenCount,
      total: inputTokenCount + outputTokenCount,
    },
  });
}

function getCompletion(chunk: ContentBlockStartChunk | ContentBlockDeltaChunk) {
  return chunk.type === 'content_block_start' ? chunk.content_block.text : chunk.delta.text;
}
