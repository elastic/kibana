/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, Server } from 'hapi';
import { initHeartbeatServer } from './heartbeat_server';
import { compose } from './lib/compose/kibana';

export interface KibanaRouteOptions {
  path: string;
  method: string;
  vhost?: string | string[];
  handler: (request: Request) => any;
  options: any;
}

export interface KibanaServer {
  route: (options: KibanaRouteOptions) => void;
}

export const initServerWithKibana = (server: Server) => {
  const libs = compose(server);
  initHeartbeatServer(libs);
};
