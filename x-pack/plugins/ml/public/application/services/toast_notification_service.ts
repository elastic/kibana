/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ToastInput, ToastOptions, ToastsStart } from 'kibana/public';
import { useMemo } from 'react';
import { useNotifications } from '../contexts/kibana';
import { MLRequestFailure } from '../util/ml_error';
import { ErrorType, extractErrorProperties } from '../../../common/util/errors';

export type ToastNotificationService = ReturnType<typeof toastNotificationServiceProvider>;

export function toastNotificationServiceProvider(toastNotifications: ToastsStart) {
  function displayDangerToast(toastOrTitle: ToastInput, options?: ToastOptions) {
    toastNotifications.addDanger(toastOrTitle, options);
  }

  function displaySuccessToast(toastOrTitle: ToastInput, options?: ToastOptions) {
    toastNotifications.addSuccess(toastOrTitle, options);
  }

  function displayErrorToast(error: ErrorType, toastTitle: string) {
    const errorObj = extractErrorProperties(error);
    toastNotifications.addError(new MLRequestFailure(errorObj, error), {
      title: toastTitle,
    });
  }

  return { displayDangerToast, displaySuccessToast, displayErrorToast };
}

/**
 * Hook to use {@link ToastNotificationService} in React components.
 */
export function useToastNotificationService(): ToastNotificationService {
  const { toasts } = useNotifications();
  return useMemo(() => toastNotificationServiceProvider(toasts), []);
}
