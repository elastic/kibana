/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';

import { ErrorToastOptions } from '../../../../../../src/core/public';
import { useToasts } from '../lib/kibana';
import { isAppError, AppError } from '../utils/api';

export const useAppToasts = () => {
  const toasts = useToasts();

  const addAppError = useCallback(
    (error: AppError, options: ErrorToastOptions) => {
      toasts.addError(error, {
        ...options,
        toastMessage: error.body.message,
      });
    },
    [toasts]
  );

  const addError = useCallback(
    (error: unknown, options: ErrorToastOptions) => {
      if (isAppError(error)) {
        addAppError(error, options);
      } else {
        if (error instanceof Error) {
          toasts.addError(error, options);
        } else {
          toasts.addError(new Error(String(error)), options);
        }
      }
    },
    [addAppError, toasts]
  );

  return { ...toasts, addError };
};
