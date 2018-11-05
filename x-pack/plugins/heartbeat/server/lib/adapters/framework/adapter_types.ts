/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLOptions } from 'apollo-server-core';
import { GraphQLSchema } from 'graphql';
import { Lifecycle, ResponseToolkit } from 'hapi';
import { RouteOptions } from 'hapi';

export interface HBFrameworkRequest {
  user: string;
  headers: Record<string, any>;
  payload: Record<string, any>;
  params: Record<string, any>;
  query: Record<string, any>;
}

export type FrameworkResponse = Lifecycle.ReturnValue;

export interface HBFrameworkRouteOptions<
  RouteRequest extends HBFrameworkRequest,
  RouteResponse extends FrameworkResponse
> {
  path: string;
  method: string;
  handler: (req: Request, h: ResponseToolkit) => any;
  config?: any;
}

export type HBFrameworkRouteHandler<RouteRequest extends HBFrameworkRequest> = (
  request: HBFrameworkRequest,
  h: ResponseToolkit
) => void;

export type HapiOptionsFunction = (req: Request) => GraphQLOptions | Promise<GraphQLOptions>;

export interface HBHapiGraphQLPluginOptions {
  path: string;
  vhost?: string;
  route?: RouteOptions;
  graphQLOptions: GraphQLOptions | HapiOptionsFunction;
}

export interface BackendFrameworkAdapter {
  registerRoute<RouteRequest extends HBFrameworkRequest, RouteResponse extends FrameworkResponse>(
    route: HBFrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
}
