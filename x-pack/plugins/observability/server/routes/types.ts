/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type {
  EndpointOf,
  ReturnOf,
  ServerRoute,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
import { CoreSetup, CoreStart, KibanaRequest, Logger } from 'kibana/server';
import { RuleDataPluginService } from '../../../rule_registry/server';

import { ObservabilityServerRouteRepository } from './get_global_observability_server_route_repository';
import { ObservabilityRequestHandlerContext } from '../types';

export { ObservabilityServerRouteRepository };

export interface ObservabilityRouteHandlerResources {
  core: {
    start: () => Promise<CoreStart>;
    setup: CoreSetup;
  };
  ruleDataService: RuleDataPluginService;
  request: KibanaRequest;
  context: ObservabilityRequestHandlerContext;
  logger: Logger;
}

export interface ObservabilityRouteCreateOptions {
  options: {
    tags: string[];
  };
}

export type AbstractObservabilityServerRouteRepository = ServerRouteRepository<
  ObservabilityRouteHandlerResources,
  ObservabilityRouteCreateOptions,
  Record<
    string,
    ServerRoute<
      string,
      t.Mixed | undefined,
      ObservabilityRouteHandlerResources,
      any,
      ObservabilityRouteCreateOptions
    >
  >
>;

export type ObservabilityAPIReturnType<
  TEndpoint extends EndpointOf<ObservabilityServerRouteRepository>
> = ReturnOf<ObservabilityServerRouteRepository, TEndpoint>;
