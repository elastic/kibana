/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useRef } from 'react';

import { ErrorToastOptions, ToastsStart, Toast } from '../../../../../../src/core/public';
import { useToasts } from '../lib/kibana';
import { isAppError, AppError } from '../utils/api';

export type UseAppToasts = Pick<ToastsStart, 'addSuccess'> & {
  api: ToastsStart;
  addError: (error: unknown, options: ErrorToastOptions) => Toast;
};

export const useAppToasts = (): UseAppToasts => {
  const toasts = useToasts();
  const addError = useRef(toasts.addError.bind(toasts)).current;
  const addSuccess = useRef(toasts.addSuccess.bind(toasts)).current;

  const addAppError = useCallback(
    (error: AppError, options: ErrorToastOptions) =>
      addError(error, {
        ...options,
        toastMessage: error.body.message,
      }),
    [addError]
  );

  const _addError = useCallback(
    (error: unknown, options: ErrorToastOptions) => {
      if (isAppError(error)) {
        return addAppError(error, options);
      } else {
        if (error instanceof Error) {
          return addError(error, options);
        } else {
          return addError(new Error(String(error)), options);
        }
      }
    },
    [addAppError, addError]
  );

  return { api: toasts, addError: _addError, addSuccess };
};
