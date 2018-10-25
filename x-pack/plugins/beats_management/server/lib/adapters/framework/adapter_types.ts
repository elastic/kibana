/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { internalAuthData } from '../../../utils/wrap_request';
export interface BackendFrameworkAdapter {
  internalUser: FrameworkInternalUser;
  version: string;
  getSetting(settingPath: string): any;
  exposeStaticDir(urlPath: string, dir: string): void;
  registerRoute<RouteRequest extends FrameworkWrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
}

export interface FrameworkAuthenticatedUser<AuthDataType = any> {
  kind: 'authenticated';
  [internalAuthData]: AuthDataType;
  username: string;
  roles: string[];
  full_name: string | null;
  email: string | null;
  metadata: {
    [key: string]: any;
  };
  enabled: boolean;
}

export interface FrameworkUnAuthenticatedUser {
  kind: 'unauthenticated';
}

export interface FrameworkInternalUser {
  kind: 'internal';
}

export type FrameworkUser<AuthDataType = any> =
  | FrameworkAuthenticatedUser<AuthDataType>
  | FrameworkUnAuthenticatedUser
  | FrameworkInternalUser;
export interface FrameworkRequest<
  InternalRequest extends FrameworkWrappableRequest = FrameworkWrappableRequest
> {
  user: FrameworkUser<InternalRequest['headers']>;
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
  licenseRequired?: boolean;
  requiredRoles?: string[];
  handler: FrameworkRouteHandler<RouteRequest, RouteResponse>;
  config?: {};
}

export type FrameworkRouteHandler<RouteRequest extends FrameworkWrappableRequest, RouteResponse> = (
  request: FrameworkRequest<RouteRequest>,
  reply: any
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
