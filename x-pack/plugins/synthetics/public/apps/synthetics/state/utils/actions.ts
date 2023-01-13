/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import type { IHttpSerializedFetchError } from './http_error';

export function createAsyncAction<
  Payload,
  SuccessPayload,
  FailurePayload = IHttpSerializedFetchError<Payload>
>(actionStr: string) {
  return {
    get: createAction(actionStr, (payload: Payload) => prepareForTimestamp(payload)),
    success: createAction<SuccessPayload>(`${actionStr}_SUCCESS`),
    fail: createAction<FailurePayload>(`${actionStr}_FAIL`),
  };
}

export type Nullable<T> = T | null;

// Action prepare function which adds meta.dispatchedAt timestamp to the action
function prepareForTimestamp<Payload>(payload: Payload) {
  return {
    payload,
    meta: {
      dispatchedAt: Date.now(),
    },
  };
}
