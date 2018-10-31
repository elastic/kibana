/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BackendFrameworkAdapter,
  FrameworkRequest,
  FrameworkResponse,
  FrameworkRouteOptions,
} from './adapter_types';

export class KibanaBackendFrameworkAdapter implements BackendFrameworkAdapter {
  private server: any;

  constructor(hapiServer: any) {
    this.server = hapiServer;
  }

  public registerRoute<
    RouteRequest extends FrameworkRequest,
    RouteResponse extends FrameworkResponse
  >(route: FrameworkRouteOptions<RouteRequest, RouteResponse>) {
    this.server.route(route);
  }
}
