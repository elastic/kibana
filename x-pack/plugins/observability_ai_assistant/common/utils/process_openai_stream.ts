/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/
import { filter, map, Observable, tap } from 'rxjs';
import type { CreateChatCompletionResponseChunk } from '../types';

class TokenLimitReachedError extends Error {
  constructor() {
    super(`Token limit reached`);
  }
}

class ServerError extends Error {}

export function processOpenAiStream() {
  return (source: Observable<string>): Observable<CreateChatCompletionResponseChunk> =>
    source.pipe(
      map((line) => line.substring(6)),
      filter((line) => !!line && line !== '[DONE]'),
      map(
        (line) =>
          JSON.parse(line) as CreateChatCompletionResponseChunk | { error: { message: string } }
      ),
      tap((line) => {
        if ('error' in line) {
          throw new ServerError(line.error.message);
        }
        if (
          'choices' in line &&
          line.choices.length &&
          line.choices[0].finish_reason === 'length'
        ) {
          throw new TokenLimitReachedError();
        }
      }),
      filter(
        (line): line is CreateChatCompletionResponseChunk =>
          'object' in line && line.object === 'chat.completion.chunk'
      )
    );
}
