/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, map, OperatorFunction, pipe, switchMap, tap, throwError } from 'rxjs';
import {
  createInferenceInternalError,
  InferenceTaskError,
  InferenceTaskErrorEvent,
} from '../../common/errors';
import { InferenceTaskEvent, InferenceTaskEventType } from '../../common/inference_task';
import {
  createObservableFromHttpResponse,
  StreamedHttpResponse,
} from './create_observable_from_http_response';

export function httpResponseIntoObservable<
  T extends InferenceTaskEvent = never
>(): OperatorFunction<StreamedHttpResponse, T> {
  return pipe(
    switchMap((response) => createObservableFromHttpResponse(response)),
    catchError((error) => {
      return throwError(() => createInferenceInternalError(error.message));
    }),
    map((line): T => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw createInferenceInternalError(`Failed to parse JSON`);
      }
    }),
    tap((event) => {
      if (event.type === InferenceTaskEventType.error) {
        const errorEvent = event as unknown as InferenceTaskErrorEvent;
        throw new InferenceTaskError(
          errorEvent.error.code,
          errorEvent.error.message,
          errorEvent.error.meta
        );
      }
    })
  );
}
