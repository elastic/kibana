/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { EntitiesAPIServerRouteRepository as EntitiesAPIServerRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type EntitiesAPIClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type EntitiesAPIClient = RouteRepositoryClient<
  EntitiesAPIServerRouteRepository,
  EntitiesAPIClientOptions
>;

export type AutoAbortedEntitiesAPIClient = RouteRepositoryClient<
  EntitiesAPIServerRouteRepository,
  Omit<EntitiesAPIClientOptions, 'signal'>
>;

export type EntitiesAPIEndpoint = keyof EntitiesAPIServerRouteRepository;

export type APIReturnType<TEndpoint extends EntitiesAPIEndpoint> = ReturnOf<
  EntitiesAPIServerRouteRepository,
  TEndpoint
>;

export type EntitiesAPIClientRequestParamsOf<TEndpoint extends EntitiesAPIEndpoint> =
  ClientRequestParamsOf<EntitiesAPIServerRouteRepository, TEndpoint>;

export function createEntitiesAPIClient(core: CoreStart | CoreSetup): EntitiesAPIClient {
  return createRepositoryClient(core);
}
