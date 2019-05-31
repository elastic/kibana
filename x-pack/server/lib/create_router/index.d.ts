/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, ResponseToolkit } from 'hapi';
import { Legacy } from 'kibana';
import { CallWithRequest } from './call_with_request_factory';

export type RouterRouteHandler = (
  req: Request,
  callWithRequest: ReturnType<CallWithRequest>,
  responseToolkit: ResponseToolkit
) => Promise<any>;

export type RouterRoute = (path: string, handler: RouterRouteHandler) => Router;

export interface Router {
  get: RouterRoute;
  post: RouterRoute;
  put: RouterRoute;
  delete: RouterRoute;
  patch: RouterRoute;
}

export declare function createRouter(
  server: Legacy.Server,
  pluginId: string,
  apiBasePath: string
): Router;
