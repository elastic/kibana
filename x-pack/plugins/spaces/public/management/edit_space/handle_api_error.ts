/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core-notifications-browser';

interface HandleErrorDeps {
  toasts: NotificationsStart['toasts'];
}

export const handleApiError = (error: any, deps: HandleErrorDeps) => {
  console.error(error); // eslint-disable-line no-console

  const message = error?.body?.message ?? error.toString();
  deps.toasts.addError(error, {
    title: message,
  });
};
