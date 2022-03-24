/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from 'src/core/public';
import { fatalErrors, toasts } from './notification';

interface CommonErrorBody extends ResponseErrorBody {
  error: string;
  attributes: { causes: unknown[] };
}

function createToastConfig(error: IHttpFetchError<CommonErrorBody>, errorTitle: string) {
  if (error && error.body) {
    // Error body shape is defined by the API.
    const { error: errorString, statusCode, message: errorMessage, attributes } = error.body;
    const message = attributes?.causes?.length
      ? attributes.causes[attributes.causes.length - 1]
      : errorMessage;

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
  return fatalErrors.add(error, errorTitle);
}

export function showApiError(error: IHttpFetchError<CommonErrorBody>, errorTitle: string) {
  const toastConfig = createToastConfig(error, errorTitle);

  if (toastConfig) {
    return toasts.addDanger(toastConfig);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  fatalErrors.add(error, errorTitle);
}
