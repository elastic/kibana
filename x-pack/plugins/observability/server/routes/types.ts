/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { ServerRoute, ServerRouteRepository } from '@kbn/server-route-repository';
import { CoreSetup, CoreStart, KibanaRequest, Logger, RequestHandlerContext } from 'kibana/server';
import { ObservabilityRuleRegistry } from '../plugin';

export interface ObservabilityRouteHandlerResources {
  core: {
    start: () => Promise<CoreStart>;
    setup: CoreSetup;
  };
  ruleRegistry: ObservabilityRuleRegistry;
  request: KibanaRequest;
  context: RequestHandlerContext;
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
