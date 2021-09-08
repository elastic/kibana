/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IScopedClusterClient, Logger } from 'src/core/server';
import type { ESSearchRequest } from 'src/core/types/elasticsearch';

export interface CreateAbortableEsClientFactoryOpts {
  scopedClusterClient: IScopedClusterClient;
  cancelled$: BehaviorSubject<boolean>;
  logger: Logger;
}

export function createAbortableEsClientFactory(opts: CreateAbortableEsClientFactoryOpts) {
  const { scopedClusterClient, cancelled$, logger } = opts;
  return (query: ESSearchRequest, asInternalUser: boolean = true) => {
    const esClient = asInternalUser
      ? scopedClusterClient.asInternalUser
      : scopedClusterClient.asCurrentUser;

    return cancelEsRequestOnAbort(esClient.search(query), cancelled$, logger);
  };
}

export function cancelEsRequestOnAbort<T extends TransportRequestPromise<unknown>>(
  promise: T,
  cancelled$: BehaviorSubject<boolean>,
  logger: Logger
) {
  const subscription = cancelled$.pipe(filter((cancelled: boolean) => cancelled)).subscribe(() => {
    logger.info(`Cancelling es search!!!!!`);
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
