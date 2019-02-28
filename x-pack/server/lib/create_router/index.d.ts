/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseObject, ResponseToolkit } from 'hapi';

type CallWithRequest = (request: any, action: string, params: any) => any;
type RouterRoute = (
  path: string,
  handler: (
    req: Request,
    callWithRequest: CallWithRequest,
    responseToolkit: ResponseToolkit
  ) => Promise<ResponseObject>
) => Router;
interface Router {
  get: RouterRoute;
  post: RouterRoute;
  put: RouterRoute;
  delete: RouterRoute;
  patch: RouterRoute;
}

export declare function createRouter(server: any, pluginId: string, apiBasePath: string): Router;
