/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, of, OperatorFunction, throwError } from 'rxjs';
import {
  createFunctionLimitExceededError,
  isFunctionNotFoundError,
  MessageAddEvent,
} from '../../../../common/conversation_complete';
import { createServerSideFunctionResponseError } from '../../util/create_server_side_function_response_error';

export function catchFunctionNotFoundError<T>(): OperatorFunction<T, T | MessageAddEvent> {
  return catchError((error) => {
    if (isFunctionNotFoundError(error)) {
      const functionLimitExceededError = createFunctionLimitExceededError();
      return of(
        createServerSideFunctionResponseError({
          name: error.meta.name,
          error: functionLimitExceededError,
        })
      );
    }

    return throwError(() => error);
  });
}
