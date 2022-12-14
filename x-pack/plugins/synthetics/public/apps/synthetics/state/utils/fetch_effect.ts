/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { call, put } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { IHttpSerializedFetchError, serializeHttpFetchError } from './http_error';

/**
 * Factory function for a fetch effect. It expects three action creators,
 * one to call for a fetch, one to call for success, and one to handle failures.
 * @param fetch creates a fetch action
 * @param success creates a success action
 * @param fail creates a failure action
 * @template T the action type expected by the fetch action
 * @template R the type that the API request should return on success
 * @template S the type of the success action
 * @template F the type of the failure action
 */
export function fetchEffectFactory<T, R, S, F>(
  fetch: (request: T) => Promise<R>,
  success: (response: R) => PayloadAction<S>,
  fail: (error: IHttpSerializedFetchError) => PayloadAction<F>
) {
  return function* (action: PayloadAction<T>): Generator {
    try {
      const response = yield call(fetch, action.payload);
      if (response instanceof Error) {
        // eslint-disable-next-line no-console
        console.error(response);

        yield put(fail(serializeHttpFetchError(response as IHttpFetchError)));
      } else {
        yield put(success(response as R));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      yield put(fail(serializeHttpFetchError(error)));
    }
  };
}
