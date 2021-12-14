/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportRequestOptions, TransportResult } from '@elastic/elasticsearch';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from 'src/core/server';
import type { ESSearchRequest } from 'src/core/types/elasticsearch';

export interface IAbortableEsClient {
  search: (
    query: ESSearchRequest,
    options?: TransportRequestOptions
  ) => Promise<TransportResult<SearchResponse<unknown>, unknown>>;
}

export interface IAbortableClusterClient {
  readonly asInternalUser: IAbortableEsClient;
  readonly asCurrentUser: IAbortableEsClient;
}
export interface CreateAbortableEsClientFactoryOpts {
  scopedClusterClient: IScopedClusterClient;
  abortController: AbortController;
}

export function createAbortableEsClientFactory(opts: CreateAbortableEsClientFactoryOpts) {
  const { scopedClusterClient, abortController } = opts;
  return {
    asInternalUser: {
      search: async (query: ESSearchRequest, options?: TransportRequestOptions) => {
        try {
          const searchOptions = options ?? {};
          return await scopedClusterClient.asInternalUser.search(query, {
            ...searchOptions,
            signal: abortController.signal,
          });
        } catch (e) {
          if (abortController.signal.aborted) {
            throw new Error('Search has been aborted due to cancelled execution');
          }
          throw e;
        }
      },
    },
    asCurrentUser: {
      search: async (query: ESSearchRequest, options?: TransportRequestOptions) => {
        try {
          const searchOptions = options ?? {};
          return await scopedClusterClient.asCurrentUser.search(query, {
            ...searchOptions,
            signal: abortController.signal,
          });
        } catch (e) {
          if (abortController.signal.aborted) {
            throw new Error('Search has been aborted due to cancelled execution');
          }
          throw e;
        }
      },
    },
  };
}
