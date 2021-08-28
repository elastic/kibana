/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { KibanaRequest } from 'src/core/server';

export function cancelEsRequestOnAbort<T extends TransportRequestPromise<any>>(
  promise: T,
  request: KibanaRequest
) {
  const subscription = request.events.aborted$.subscribe(() => {
    promise.abort();
  });

  // using .catch() here means unsubscribe will be called
  // after it has thrown an error, so we use .then(onSuccess, onFailure)
  // syntax
  promise.then(
    () => subscription.unsubscribe(),
    () => subscription.unsubscribe()
  );

  return promise;
}
