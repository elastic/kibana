/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IHttpFetchError } from 'src/core/public';
import { fatalErrors, toasts } from './notification';

function createToastConfig(error: IHttpFetchError, errorTitle: string) {
  if (error && error.body) {
    // Error body shape is defined by the API.
    const { error: errorString, statusCode, message } = error.body;

    return {
      title: errorTitle,
      text: `${statusCode}: ${errorString}. ${message}`,
    };
  }
}

export function showApiWarning(error: IHttpFetchError, errorTitle: string) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return toasts.addWarning(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  return fatalErrors.add(error, errorTitle);
}

export function showApiError(error: IHttpFetchError, errorTitle: string) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return toasts.addDanger(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  fatalErrors.add(error, errorTitle);
}
