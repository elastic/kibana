/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { call, put } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { ErrorToastOptions } from '@kbn/core-notifications-browser';
import { toastTitle } from '../monitor_list/toast_title';
import { kibanaService } from '../../../../utils/kibana_service';
import { IHttpSerializedFetchError, serializeHttpFetchError } from './http_error';

interface ToastParams<MessageType> {
  message: MessageType;
  lifetimeMs?: number;
  testAttribute?: string;
}

interface ActionMessages {
  success: ToastParams<string>;
  error: ToastParams<ErrorToastOptions>;
}

export const sendSuccessToast = (payload: ToastParams<string>) => {
  kibanaService.toasts.addSuccess({
    title: toastTitle({
      title: payload.message,
      testAttribute: payload.testAttribute,
    }),
    toastLifeTimeMs: payload.lifetimeMs,
  });
};

export const sendErrorToast = (payload: ToastParams<ErrorToastOptions>, error: Error) => {
  kibanaService.toasts.addError(error, {
    ...payload.message,
    toastLifeTimeMs: payload.lifetimeMs,
  });
};

/**
 * Factory function for a fetch effect. It expects three action creators,
 * one to call for a fetch, one to call for success, and one to handle failures.
 * @param fetch creates a fetch action
 * @param success creates a success action
 * @param fail creates a failure action
 * @param onSuccess
 * @param onFailure
 * @template T the action type expected by the fetch action
 * @template R the type that the API request should return on success
 * @template S the type of the success action
 * @template F the type of the failure action
 */
export function fetchEffectFactory<T, R, S, F>(
  fetch: (request: T) => Promise<R>,
  success: (response: R) => PayloadAction<S>,
  fail: (error: IHttpSerializedFetchError<T>) => PayloadAction<F>,
  onSuccess?: ((response: R) => void) | string,
  onFailure?: ((error: Error) => void) | string
) {
  return function* (action: PayloadAction<T>): Generator {
    try {
      const response = yield call(fetch, action.payload);
      if (response instanceof Error) {
        // eslint-disable-next-line no-console
        console.error(response);

        yield put(fail(serializeHttpFetchError(response as IHttpFetchError, action.payload)));
        if (typeof onFailure === 'function') {
          onFailure?.(response);
        } else if (typeof onFailure === 'string') {
          kibanaService.core.notifications.toasts.addError(response, {
            title: onFailure,
          });
        }
      } else {
        yield put(success(response as R));
        const successMessage = (action.payload as unknown as ActionMessages)?.success;
        if (successMessage?.message) {
          kibanaService.toasts.addSuccess({
            title: toastTitle({
              title: successMessage.message,
              testAttribute: successMessage.testAttribute,
            }),
            toastLifeTimeMs: successMessage.lifetimeMs,
          });
        }

        if (typeof onSuccess === 'function') {
          onSuccess?.(response as R);
        } else if (onSuccess && typeof onSuccess === 'string') {
          kibanaService.core.notifications.toasts.addSuccess(onSuccess);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      const errorMessage = (action.payload as unknown as ActionMessages)?.error;

      if (errorMessage?.message) {
        kibanaService.toasts.addError(error, {
          ...errorMessage.message,
          toastLifeTimeMs: errorMessage.lifetimeMs,
        });
      }

      yield put(fail(serializeHttpFetchError(error, action.payload)));
      if (typeof onFailure === 'function') {
        onFailure?.(error);
      } else if (typeof onFailure === 'string') {
        kibanaService.core.notifications.toasts.addError(error, {
          title: onFailure,
        });
      }
    }
  };
}
