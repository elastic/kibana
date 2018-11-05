/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { Server } from 'hapi';
import {
  BackendFrameworkAdapter,
  FrameworkResponse,
  HBFrameworkRequest,
  HBFrameworkRouteOptions,
  HBHapiGraphQLPluginOptions,
} from './adapter_types';
import { hbGraphQLHapiPlugin } from './apollo_framework_adapter';

export class KibanaBackendFrameworkAdapter implements BackendFrameworkAdapter {
  private server: Server;

  constructor(hapiServer: any) {
    this.server = hapiServer;
  }

  public registerRoute<
    RouteRequest extends HBFrameworkRequest,
    RouteResponse extends FrameworkResponse
  >(route: HBFrameworkRouteOptions<RouteRequest, RouteResponse>) {
    this.server.route(route);
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.server.register<HBHapiGraphQLPluginOptions>({
      options: {
        graphQLOptions: (req: any) => ({
          context: { req },
          schema,
        }),
        path: routePath,
      },
      plugin: hbGraphQLHapiPlugin,
    });
  }
}
