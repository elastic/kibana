/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ServerRoute } from 'hapi';

export { Request, Server, ServerRoute } from 'hapi';
export { LegacyPluginInitializer, LegacyPluginOptions } from 'src/legacy/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ClientPluginInitializerContext {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerPluginInitializerContext {}

export interface HttpServiceSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}

export interface CoreSetup {
  http: HttpServiceSetup;
}

// the contract with the registry
export type IntegrationList = IntegrationListItem[];

// registry /list
export interface IntegrationListItem {
  name: string;
  version: string;
  description: string;
  icon: string;
}

// registry /package/{name}
// https://github.com/elastic/integrations-registry/blob/8306aa1abe83eab71c7677e4e964ebf66dc3880b/main.go#L180-L190
export interface IntegrationInfo {
  name: string;
  version: string;
  description: string;
  requirement: {
    kibana: {
      min: string;
      max: string;
    };
  };
}
