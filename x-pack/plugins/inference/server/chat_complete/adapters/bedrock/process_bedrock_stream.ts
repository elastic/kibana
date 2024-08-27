/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscriber } from 'rxjs';
import { toUtf8 } from '@smithy/util-utf8';
import {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  ChatCompletionChunkToolCall,
  ChatCompletionEventType,
} from '../../../../common/chat_complete';
import type { CompletionChunk, MessageStopChunk } from './types';
import type { BedrockChunkMember } from './serde_eventstream_into_observable';

export function processBedrockStream() {
  return (source: Observable<BedrockChunkMember>) =>
    new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>((subscriber) => {
      // We use this to make sure we don't complete the Observable
      // before all operations have completed.
      let nextPromise = Promise.resolve();

      async function handleNext(value: BedrockChunkMember) {
        const chunkBody: CompletionChunk = parseSerdeChunkBody(value.chunk);

        if (isTokenCountCompletionChunk(chunkBody)) {
          return emitTokenCountEvent(subscriber, chunkBody);
        }

        let completionChunk = '';
        let toolCallChunk: ChatCompletionChunkToolCall | undefined;

        if (chunkBody.type === 'content_block_start') {
          if (chunkBody.content_block.type === 'text') {
            completionChunk = chunkBody.content_block.text || '';
          } else if (chunkBody.content_block.type === 'tool_use') {
            toolCallChunk = {
              index: chunkBody.index,
              toolCallId: chunkBody.content_block.id,
              function: {
                name: chunkBody.content_block.name,
                // the API returns '{}' here, which can't be merged with the deltas...
                arguments: '',
              },
            };
          }
        } else if (chunkBody.type === 'content_block_delta') {
          if (chunkBody.delta.type === 'text_delta') {
            completionChunk = chunkBody.delta.text || '';
          } else if (chunkBody.delta.type === 'input_json_delta') {
            toolCallChunk = {
              index: chunkBody.index,
              toolCallId: '',
              function: {
                name: '',
                arguments: chunkBody.delta.partial_json,
              },
            };
          }
        } else if (chunkBody.type === 'message_delta') {
          completionChunk = chunkBody.delta.stop_sequence || '';
        } else {
          // we do not handle other event types
          return;
        }

        subscriber.next({
          type: ChatCompletionEventType.ChatCompletionChunk,
          content: completionChunk,
          tool_calls: toolCallChunk ? [toolCallChunk] : [],
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
  subscriber: Subscriber<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>,
  chunk: MessageStopChunk
) {
  const { inputTokenCount, outputTokenCount } = chunk['amazon-bedrock-invocationMetrics'];

  subscriber.next({
    type: ChatCompletionEventType.ChatCompletionTokenCount,
    tokens: {
      completion: outputTokenCount,
      prompt: inputTokenCount,
      total: inputTokenCount + outputTokenCount,
    },
  });
}

function parseSerdeChunkBody(chunk: BedrockChunkMember['chunk']) {
  return JSON.parse(Buffer.from(JSON.parse(toUtf8(chunk.body)).bytes, 'base64').toString('utf-8'));
}
