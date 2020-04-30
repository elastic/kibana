/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { AsyncAction, AsyncAction1 } from './types';
import { IHttpFetchError } from '../../../../../../target/types/core/public/http';

export function createAsyncAction<Payload, SuccessPayload>(
  actionStr: string
): AsyncAction1<Payload, SuccessPayload>;
export function createAsyncAction<Payload, SuccessPayload>(
  actionStr: string
): AsyncAction<Payload, SuccessPayload> {
  return {
    get: createAction<Payload>(actionStr),
    success: createAction<SuccessPayload>(`${actionStr}_SUCCESS`),
    fail: createAction<IHttpFetchError>(`${actionStr}_FAIL`),
  };
}
