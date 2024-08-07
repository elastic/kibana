/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import { httpResponseIntoObservable } from './http_response_into_observable';
import type { StreamedHttpResponse } from './create_observable_from_http_response';
import { ChatCompletionEventType } from '../../common/chat_complete';
import { InferenceTaskEventType } from '../../common/tasks';
import { InferenceTaskErrorCode } from '../../common/errors';

function toSse(...events: Array<Record<string, any>>) {
  return events.map((event) => new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}

describe('httpResponseIntoObservable', () => {
  it('parses SSE output', async () => {
    const events = [
      {
        type: ChatCompletionEventType.ChatCompletionChunk,
        content: 'Hello',
      },
      {
        type: ChatCompletionEventType.ChatCompletionChunk,
        content: 'Hello again',
      },
    ];

    const messages = await lastValueFrom(
      of<StreamedHttpResponse>({
        response: {
          // @ts-expect-error
          body: ReadableStream.from(toSse(...events)),
        },
      }).pipe(httpResponseIntoObservable(), toArray())
    );

    expect(messages).toEqual(events);
  });

  it('throws serialized errors', async () => {
    const events = [
      {
        type: InferenceTaskEventType.error,
        error: {
          code: InferenceTaskErrorCode.internalError,
          message: 'Internal error',
        },
      },
    ];

    await expect(async () => {
      await lastValueFrom(
        of<StreamedHttpResponse>({
          response: {
            // @ts-expect-error
            body: ReadableStream.from(toSse(...events)),
          },
        }).pipe(httpResponseIntoObservable(), toArray())
      );
    }).rejects.toThrowError(`Internal error`);
  });
});
