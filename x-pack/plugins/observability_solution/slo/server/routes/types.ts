/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EndpointOf, ReturnOf, ServerRouteRepository } from '@kbn/server-route-repository';
import { KibanaRequest, Logger } from '@kbn/core/server';

import { SloServerRouteRepository } from './get_slo_server_route_repository';
import { SloRequestHandlerContext } from '../types';
import { RegisterRoutesDependencies } from './register_routes';
import { SloConfig } from '..';

export type { SloServerRouteRepository };

export interface SloRouteHandlerResources {
  context: SloRequestHandlerContext;
  dependencies: RegisterRoutesDependencies;
  logger: Logger;
  request: KibanaRequest;
  config: SloConfig;
}

export interface SloRouteCreateOptions {
  options: {
    tags: string[];
    access?: 'public' | 'internal';
  };
}

export type AbstractSloServerRouteRepository = ServerRouteRepository;

export type ObservabilityAPIReturnType<TEndpoint extends EndpointOf<SloServerRouteRepository>> =
  ReturnOf<SloServerRouteRepository, TEndpoint>;
