/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Lifecycle, ResponseToolkit } from 'hapi';

export interface FrameworkRequest {
  user: any;
  headers: any;
  info: any;
  payload: any;
  params: any;
  query: any;
}

export type FrameworkResponse = Lifecycle.ReturnValue;

export interface FrameworkRouteOptions<
  RouteRequest extends FrameworkRequest,
  RouteResponse extends FrameworkResponse
> {
  path: string;
  method: string;
  handler: any;
  config?: any;
}

export type FrameworkRouteHandler<RouteRequest extends FrameworkRequest> = (
  request: FrameworkRequest,
  h: ResponseToolkit
) => void;

export interface BackendFrameworkAdapter {
  registerRoute<RouteRequest extends FrameworkRequest, RouteResponse extends FrameworkResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
}
