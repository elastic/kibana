/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';

export function cancelEsRequestOnAbort<T extends any>(
  promise: T,
  request: KibanaRequest,
  controller: AbortController
) {
  const subscription = request.events.aborted$.subscribe(() => {
    controller.abort();
  });

  // using .catch() here means unsubscribe will be called
  // after it has thrown an error, so we use .then(onSuccess, onFailure)
  // syntax
  // @ts-expect-error fix abort
  promise.then(
    () => subscription.unsubscribe(),
    () => subscription.unsubscribe()
  );

  return promise;
}
