/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteRepositoryClient } from '@kbn/server-route-repository';
import type { HttpFetchOptions } from '../../../../../../src/core/public/http/types';
import type { ObservabilityServerRouteRepository } from '../../../server/routes/get_global_observability_server_route_repository';
import type {
  AbstractObservabilityServerRouteRepository,
  ObservabilityAPIReturnType,
} from '../../../server/routes/types';

export type ObservabilityClientOptions = Omit<
  HttpFetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type AbstractObservabilityClient = RouteRepositoryClient<
  AbstractObservabilityServerRouteRepository,
  ObservabilityClientOptions & { params?: Record<string, any> }
>;

export type ObservabilityClient = RouteRepositoryClient<
  ObservabilityServerRouteRepository,
  ObservabilityClientOptions
>;

export { ObservabilityAPIReturnType };
