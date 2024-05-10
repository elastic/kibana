/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';

export function subscribeToAborted$<T extends Promise<any>>(
  promise: T,
  request: KibanaRequest,
  controller: AbortController
): T {
  const subscription = request.events.aborted$.subscribe(() => {
    controller.abort();
  });

  return promise.finally(() => {
    subscription.unsubscribe();
  }) as T;
}
