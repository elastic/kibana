/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, map, Observable, of } from 'rxjs';
import { PassThrough } from 'stream';
import type { Logger } from '@kbn/logging';
import {
  InferenceTaskErrorCode,
  InferenceTaskErrorEvent,
  isInferenceError,
} from '../../common/errors';
import { InferenceTaskEventType } from '../../common/inference_task';

export function observableIntoEventSourceStream(
  source$: Observable<unknown>,
  logger: Pick<Logger, 'debug' | 'error'>
) {
  const withSerializedErrors$ = source$.pipe(
    catchError((error): Observable<InferenceTaskErrorEvent> => {
      if (isInferenceError(error)) {
        logger?.error(error);
        logger?.debug(() => JSON.stringify(error));
        return of({
          type: InferenceTaskEventType.error,
          error: {
            code: error.code,
            message: error.message,
            meta: error.meta,
          },
        });
      }

      return of({
        type: InferenceTaskEventType.error,
        error: {
          code: InferenceTaskErrorCode.internalError,
          message: error.message as string,
        },
      });
    }),
    map((event) => {
      return `data: ${JSON.stringify(event)}\n\n`;
    })
  );

  const stream = new PassThrough();

  withSerializedErrors$.subscribe({
    next: (line) => {
      stream.write(line);
    },
    complete: () => {
      stream.end();
    },
    error: (error) => {
      stream.write(
        `data: ${JSON.stringify({
          type: InferenceTaskEventType.error,
          error: {
            code: InferenceTaskErrorCode.internalError,
            message: error.message,
          },
        })}\n\n`
      );
      stream.end();
    },
  });

  return stream;
}
