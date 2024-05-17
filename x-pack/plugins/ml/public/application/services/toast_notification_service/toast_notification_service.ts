/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToastInput, ToastOptions, ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { type ErrorType, MLRequestFailure, extractErrorProperties } from '@kbn/ml-error-utils';
import { useMemo } from 'react';
import { useNotifications } from '../../contexts/kibana';
import { getToastNotifications } from '../../util/dependency_cache';

export type ToastNotificationService = ReturnType<typeof toastNotificationServiceProvider>;

export function toastNotificationServiceProvider(toastNotifications: ToastsStart) {
  function displayDangerToast(toastOrTitle: ToastInput, options?: ToastOptions) {
    toastNotifications.addDanger(toastOrTitle, options);
  }

  function displayWarningToast(toastOrTitle: ToastInput, options?: ToastOptions) {
    toastNotifications.addWarning(toastOrTitle, options);
  }

  function displaySuccessToast(toastOrTitle: ToastInput, options?: ToastOptions) {
    toastNotifications.addSuccess(toastOrTitle, options);
  }

  function displayErrorToast(error: ErrorType, title?: string, toastLifeTimeMs?: number) {
    const errorObj = extractErrorProperties(error);
    toastNotifications.addError(new MLRequestFailure(errorObj, error), {
      title:
        title ??
        i18n.translate('xpack.ml.toastNotificationService.errorTitle', {
          defaultMessage: 'An error has occurred',
        }),
      ...(toastLifeTimeMs ? { toastLifeTimeMs } : {}),
    });
  }

  return { displayDangerToast, displayWarningToast, displaySuccessToast, displayErrorToast };
}

export function getToastNotificationService() {
  const toastNotifications = getToastNotifications();
  return toastNotificationServiceProvider(toastNotifications);
}

/**
 * Hook to use {@link ToastNotificationService} in React components.
 */
export function useToastNotificationService(): ToastNotificationService {
  const { toasts } = useNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => toastNotificationServiceProvider(toasts), []);
}
