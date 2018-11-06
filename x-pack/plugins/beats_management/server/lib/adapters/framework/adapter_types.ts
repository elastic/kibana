/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Lifecycle, ResponseToolkit } from 'hapi';
import * as t from 'io-ts';

export const internalAuthData = Symbol('internalAuthData');
export type LicenseType = 'oss' | 'trial' | 'standard' | 'basic' | 'gold' | 'platinum';
export const internalUser: FrameworkInternalUser = {
  kind: 'internal',
};
export interface BackendFrameworkAdapter {
  internalUser: FrameworkInternalUser;
  info: null | FrameworkInfo;
  log(text: string): void;
  on(event: 'xpack.status.green', cb: () => void): void;
  getSetting(settingPath: string): any;
  exposeStaticDir(urlPath: string, dir: string): void;
  registerRoute<
    RouteRequest extends FrameworkWrappableRequest,
    RouteResponse extends FrameworkResponse
  >(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
}

export const RuntimeFrameworkInfo = t.type({
  kibana: t.type({
    version: t.string,
  }),
  license: t.type({
    type: t.union(['oss', 'trial', 'standard', 'basic', 'gold', 'platinum'].map(s => t.literal(s))),
    expired: t.boolean,
    expiry_date_in_millis: t.number,
  }),
  security: t.type({
    enabled: t.boolean,
    available: t.boolean,
  }),
  watcher: t.type({
    enabled: t.boolean,
    available: t.boolean,
  }),
});
export interface FrameworkInfo extends t.TypeOf<typeof RuntimeFrameworkInfo> {}

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
  RouteRequest extends FrameworkWrappableRequest = any,
  RouteResponse extends FrameworkResponse = any
> {
  path: string;
  method: string | string[];
  vhost?: string;
  licenseRequired?: string[];
  requiredRoles?: string[];
  handler: FrameworkRouteHandler<RouteRequest, RouteResponse>;
  config?: {};
}

export type FrameworkRouteHandler<
  RouteRequest extends FrameworkWrappableRequest,
  RouteResponse extends FrameworkResponse
> = (request: FrameworkRequest<RouteRequest>, h: ResponseToolkit) => void;

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

export type FrameworkResponse = Lifecycle.ReturnValue;
