/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import { IEsError, isEsError } from '../../../../../../src/plugins/data/public';

import { ErrorToastOptions, ToastsStart, Toast } from '../../../../../../src/core/public';
import { useToasts } from '../lib/kibana';
import { isAppError } from '../utils/api';

export type UseAppToasts = Pick<ToastsStart, 'addSuccess' | 'addWarning'> & {
  api: ToastsStart;
  addError: (error: unknown, options: ErrorToastOptions) => Toast;
};

/**
 * This gives a better presentation of error data sent from the API (both general platform errors and app-specific errors).
 * This uses platform's new Toasts service to prevent modal/toast z-index collision issues.
 * This fixes some issues you can see with re-rendering since using a class such as notifications.toasts.
 * This also has an adapter and transform for detecting if a bsearch's EsError is present and then adapts that to the
 * Kibana error toaster model so that the network error message will be shown rather than a stack trace.
 */
export const useAppToasts = (): UseAppToasts => {
  const toasts = useToasts();
  const addError = useRef(toasts.addError.bind(toasts)).current;
  const addSuccess = useRef(toasts.addSuccess.bind(toasts)).current;
  const addWarning = useRef(toasts.addWarning.bind(toasts)).current;

  const _addError = useCallback(
    (error: unknown, options: ErrorToastOptions) => {
      if (error != null && isEsError(error)) {
        const err = esErrorToRequestError(error);
        return addError(err, options);
      } else if (isAppError(error)) {
        return addError(error, options);
      } else if (error instanceof Error) {
        return addError(error, options);
      } else {
        // Best guess that this is a stringable error.
        const err = new Error(String(error));
        return addError(err, options);
      }
    },
    [addError]
  );

  return { api: toasts, addError: _addError, addSuccess, addWarning };
};

/**
 * See this file, we are not allowed to import files such as es_error.
 * So instead we say maybe err is on there so that we can unwrap it and get
 * our status code from it if possible within the error in our function.
 * src/plugins/data/public/search/errors/es_error.tsx
 */
type MaybeESError = IEsError & { err?: Record<string, unknown> };

/**
 * This attempts its best to map between an IEsError which comes from bsearch to a error_toaster
 * See the file: src/core/public/notifications/toasts/error_toast.tsx
 *
 * NOTE: This is brittle at the moment from bsearch and the hope is that better support between
 * the error message and formatting of bsearch and the error_toast.tsx from Kibana core will be
 * supported in the future. However, for now, this is _hopefully_ temporary.
 *
 * Also see the file:
 * x-pack/plugins/security_solution/public/app/home/setup.tsx
 *
 * Where this same technique of overriding and changing the stack is occurring.
 */
export const esErrorToRequestError = (error: IEsError & MaybeESError): Error => {
  const maybeUnWrapped = error.err != null ? error.err : error;
  const statusCode = error.err?.statusCode != null ? `(${error.err.statusCode})` : '';
  const stringifiedError = JSON.stringify(maybeUnWrapped, null, 2);
  return {
    message: `${error.attributes?.reason ?? error.message} ${statusCode}`,
    name: error.attributes?.reason ?? error.message,
    stack: stringifiedError,
  };
};
