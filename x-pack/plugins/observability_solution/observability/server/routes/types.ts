/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EndpointOf, ReturnOf, ServerRouteRepository } from '@kbn/server-route-repository';
import { KibanaRequest, Logger } from '@kbn/core/server';

import {
  ObservabilityServerRouteRepository,
  APIEndpoint,
} from './get_global_observability_server_route_repository';
import { ObservabilityRequestHandlerContext } from '../types';
import { RegisterRoutesDependencies } from './register_routes';

export type { ObservabilityServerRouteRepository, APIEndpoint };

export interface ObservabilityRouteHandlerResources {
  context: ObservabilityRequestHandlerContext;
  dependencies: RegisterRoutesDependencies;
  logger: Logger;
  request: KibanaRequest;
}

export interface ObservabilityRouteCreateOptions {
  tags: string[];
  access?: 'public' | 'internal';
}

export type AbstractObservabilityServerRouteRepository = ServerRouteRepository;

export type ObservabilityAPIReturnType<
  TEndpoint extends EndpointOf<ObservabilityServerRouteRepository>
> = ReturnOf<ObservabilityServerRouteRepository, TEndpoint>;
