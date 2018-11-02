/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fatalError, toastNotifications } from 'ui/notify';

function createToast(error) {
  // Expect an error in the shape provided by Angular's $http service.
  if (error && error.data) {
    const { error: errorString, statusCode, message } = error.data;
    return {
      title: `${statusCode}: ${errorString}`,
      text: message,
    };
  }
}

export function showApiWarning(error, location) {
  const toast = createToast(error);

  if (toast) {
    return toastNotifications.addWarning(toast);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  return fatalError(error, location);
}

export function showApiError(error, location) {
  const toast = createToast(error);

  if (toast) {
    return toastNotifications.addDanger(toast);
  }

  // This error isn't an HTTP error, so let the fatal error screen tell the user something
  // unexpected happened.
  return fatalError(error, location);
}
