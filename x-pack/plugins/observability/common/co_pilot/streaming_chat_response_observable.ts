/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subject } from 'rxjs';
import { from } from 'rxjs';
import { mergeMap, scan } from 'rxjs/operators';
import { CreateChatCompletionResponseChunk } from '.';

export function createStreamingChatResponseObservable(
  observable: Subject<string>
): ChatResponseObservable {
  const chatResponseObservable = observable.pipe(
    mergeMap((val) =>
      from(
        val
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && line !== 'data: [DONE]')
          .map((line) => {
            const json = line.slice(6);
            try {
              return [JSON.parse(json) as CreateChatCompletionResponseChunk];
            } catch (err) {
              console.log(`Error parsing line: ${json}`);
              throw err;
            }
          })
      )
    ),
    scan((acc, value) => acc.concat(value))
  );

  return chatResponseObservable;
}

export type ChatResponseObservable = Observable<CreateChatCompletionResponseChunk[]>;
