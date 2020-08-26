/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ToastInput, ToastOptions, ToastsStart } from 'kibana/public';
import { ResponseError } from 'kibana/server';
import { useMemo } from 'react';
import { useNotifications } from '../contexts/kibana';
import {
  BoomResponse,
  extractErrorProperties,
  MLCustomHttpResponseOptions,
  MLErrorObject,
  MLResponseError,
} from '../../../common/util/errors';

export type ToastNotificationService = ReturnType<typeof toastNotificationServiceProvider>;

export function toastNotificationServiceProvider(toastNotifications: ToastsStart) {
  return {
    displayDangerToast(toastOrTitle: ToastInput, options?: ToastOptions) {
      toastNotifications.addDanger(toastOrTitle, options);
    },

    displaySuccessToast(toastOrTitle: ToastInput, options?: ToastOptions) {
      toastNotifications.addSuccess(toastOrTitle, options);
    },

    displayErrorToast(error: any, toastTitle: string) {
      const errorObj = this.parseErrorMessage(error);
      if (errorObj.fullErrorMessage !== undefined) {
        // Provide access to the full error message via the 'See full error' button.
        toastNotifications.addError(new Error(errorObj.fullErrorMessage), {
          title: toastTitle,
          toastMessage: errorObj.message,
        });
      } else {
        toastNotifications.addDanger(
          {
            title: toastTitle,
            text: errorObj.message,
          },
          { toastLifeTimeMs: 30000 }
        );
      }
    },

    parseErrorMessage(
      error:
        | MLCustomHttpResponseOptions<MLResponseError | ResponseError | BoomResponse>
        | undefined
        | string
        | MLResponseError
    ): MLErrorObject {
      if (
        typeof error === 'object' &&
        'response' in error &&
        typeof error.response === 'string' &&
        error.statusCode !== undefined
      ) {
        // MLResponseError which has been received back as part of a 'successful' response
        // where the error was passed in a separate property in the response.
        const wrapMlResponseError = {
          body: error,
          statusCode: error.statusCode,
        };
        return extractErrorProperties(wrapMlResponseError);
      }

      return extractErrorProperties(
        error as
          | MLCustomHttpResponseOptions<MLResponseError | ResponseError | BoomResponse>
          | undefined
          | string
      );
    },
  };
}

/**
 * Hook to use {@link ToastNotificationService} in React components.
 */
export function useToastNotificationService(): ToastNotificationService {
  const { toasts } = useNotifications();
  return useMemo(() => toastNotificationServiceProvider(toasts), []);
}
