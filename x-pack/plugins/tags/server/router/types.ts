/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RouteMethod,
  KibanaResponseFactory,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  IRouter,
} from 'src/core/server';

export interface RouteParams {
  router: IRouter;
}

export type TagsRouteContext = RequestHandlerContext &
  Required<Pick<RequestHandlerContext, 'tags'>>;

export type TagsRequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
> = (
  context: TagsRouteContext,
  request: KibanaRequest<P, Q, B, Method>,
  response: ResponseFactory
) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;
