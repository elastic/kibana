/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import OpenAI from 'openai';
import {
  catchError,
  concatMap,
  endWith,
  filter,
  from,
  ignoreElements,
  map,
  Observable,
  of,
} from 'rxjs';
import { PassThrough } from 'stream';
import {
  BufferFlushEvent,
  ChatCompletionChunkEvent,
  StreamingChatResponseEventType,
  StreamingChatResponseEventWithoutError,
  TokenCountEvent,
} from '../../../common/conversation_complete';

export function observableIntoOpenAIStream(
  source: Observable<StreamingChatResponseEventWithoutError | BufferFlushEvent | TokenCountEvent>,
  logger: Logger
) {
  const stream = new PassThrough();

  source
    .pipe(
      filter(
        (event): event is ChatCompletionChunkEvent =>
          event.type === StreamingChatResponseEventType.ChatCompletionChunk
      ),
      map((event) => {
        const chunk: OpenAI.ChatCompletionChunk = {
          model: 'unknown',
          choices: [
            {
              delta: {
                content: event.message.content,
                function_call: event.message.function_call,
              },
              finish_reason: null,
              index: 0,
            },
          ],
          created: new Date().getTime(),
          id: event.id,
          object: 'chat.completion.chunk',
        };
        return JSON.stringify(chunk);
      }),
      catchError((error) => {
        return of(JSON.stringify({ error: { message: error.message } }));
      }),
      endWith('[DONE]'),
      concatMap((line) => {
        return from(
          new Promise<void>((resolve, reject) => {
            stream.write(`data: ${line}\n\n`, (err) => {
              if (err) {
                return reject(err);
              }
              resolve();
            });
          })
        );
      }),
      ignoreElements()
    )
    .subscribe({
      error: (error) => {
        logger.error('Error writing stream');
        logger.error(JSON.stringify(error));
        stream.end(error);
      },
      complete: () => {
        stream.end();
      },
    });

  return stream;
}
