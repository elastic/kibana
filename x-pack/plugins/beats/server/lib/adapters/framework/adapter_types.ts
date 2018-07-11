/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouteAdditionalConfigurationOptions, IStrictReply } from 'hapi';
import { internalFrameworkRequest } from '../../../utils/wrap_request';
export interface BackendFrameworkAdapter {
  version: string;
  getSetting(settingPath: string): any;
  exposeStaticDir(urlPath: string, dir: string): void;
  registerRoute<RouteRequest extends FrameworkWrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
}

export interface FrameworkRequest<
  InternalRequest extends FrameworkWrappableRequest = FrameworkWrappableRequest
> {
  [internalFrameworkRequest]: InternalRequest;
  headers: InternalRequest['headers'];
  info: InternalRequest['info'];
  payload: InternalRequest['payload'];
  params: InternalRequest['params'];
  query: InternalRequest['query'];
}

export interface FrameworkRouteOptions<
  RouteRequest extends FrameworkWrappableRequest,
  RouteResponse
> {
  path: string;
  method: string | string[];
  vhost?: string;
  handler: FrameworkRouteHandler<RouteRequest, RouteResponse>;
  config?: Pick<
    IRouteAdditionalConfigurationOptions,
    Exclude<keyof IRouteAdditionalConfigurationOptions, 'handler'>
  >;
}

export type FrameworkRouteHandler<
  RouteRequest extends FrameworkWrappableRequest,
  RouteResponse
> = (
  request: FrameworkRequest<RouteRequest>,
  reply: IStrictReply<RouteResponse>
) => void;

export interface FrameworkWrappableRequest<
  Payload = any,
  Params = any,
  Query = any,
  Headers = any,
  Info = any
> {
  headers: Headers;
  info: Info;
  payload: Payload;
  params: Params;
  query: Query;
}
