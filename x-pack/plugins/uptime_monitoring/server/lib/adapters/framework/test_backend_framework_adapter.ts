/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import {
  BackendFrameworkAdapter,
  FrameworkResponse,
  UMFrameworkRequest,
  UMFrameworkRouteOptions,
} from './adapter_types';

export class TestBackendFrameworkAdapter implements BackendFrameworkAdapter {
  private server: any;

  constructor(server: any) {
    this.server = server;
  }

  public registerRoute<
    RouteRequest extends UMFrameworkRequest,
    RouteResponse extends FrameworkResponse
  >(route: UMFrameworkRouteOptions<UMFrameworkRequest, FrameworkResponse>): void {
    const { config, method, path, handler } = route;
    this.server.route({
      config,
      handler,
      method,
      path,
    });
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.server.register({
      options: {
        schema,
      },
      path: routePath,
    });
  }
}
