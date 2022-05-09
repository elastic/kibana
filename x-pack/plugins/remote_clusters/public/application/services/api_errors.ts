/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError } from '@kbn/core/public';
import { toasts, fatalError } from './notification';

interface CommonErrorBody {
  statusCode: number;
  message: string;
  error: string;
}

function createToastConfig(error: IHttpFetchError<CommonErrorBody>, errorTitle: string) {
  // Expect an error in the shape provided by http service.
  if (error && error.body) {
    const { error: errorString, statusCode, message } = error.body;
    return {
      title: errorTitle,
      text: `${statusCode}: ${errorString}. ${message}`,
    };
  }
}

export function showApiWarning(error: IHttpFetchError<CommonErrorBody>, errorTitle: string) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return toasts.addWarning(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  return fatalError.add(error, errorTitle);
}

export function showApiError(error: IHttpFetchError<CommonErrorBody>, errorTitle: string) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return toasts.addDanger(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  fatalError.add(error, errorTitle);
}
