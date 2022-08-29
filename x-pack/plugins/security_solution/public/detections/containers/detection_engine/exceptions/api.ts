/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_EXCEPTIONS_GET_FILTER } from '../../../../../common/constants';
import { KibanaServices } from '../../../../common/lib/kibana';
import type {
  ExceptionFilterResponse,
  GetExceptionFilterFromExceptionListIdProps,
  GetExceptionFilterFromExceptionsProps,
} from './types';

/**
 * Create a Filter query from an exception list id
 *
 * @param exceptionListId The id of the exception list from which create a Filter query
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getExceptionFilterFromExceptionListId = async ({
  exceptionListId,
  namespaceType,
  alias,
  excludeExceptions,
  chunkSize,
  signal,
}: GetExceptionFilterFromExceptionListIdProps): Promise<ExceptionFilterResponse> =>
  KibanaServices.get().http.fetch(DETECTION_ENGINE_EXCEPTIONS_GET_FILTER, {
    method: 'POST',
    body: JSON.stringify({
      exceptionListId,
      namespaceType,
      type: 'exceptionListId',
      alias,
      excludeExceptions,
      chunkSize,
    }),
    signal,
  });

/**
 * Create a Filter query from a list of exceptions
 *
 * @param exceptions Exception items to be made into a `Filter` query
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getExceptionFilterFromExceptions = async ({
  exceptions,
  alias,
  excludeExceptions,
  chunkSize,
  signal,
}: GetExceptionFilterFromExceptionsProps): Promise<ExceptionFilterResponse> =>
  KibanaServices.get().http.fetch(DETECTION_ENGINE_EXCEPTIONS_GET_FILTER, {
    method: 'POST',
    body: JSON.stringify({
      exceptions,
      type: 'exceptionItems',
      alias,
      excludeExceptions,
      chunkSize,
    }),
    signal,
  });
