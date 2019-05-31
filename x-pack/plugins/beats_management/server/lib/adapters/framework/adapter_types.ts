/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import { Lifecycle, ResponseToolkit } from 'hapi';
import * as t from 'io-ts';
import { LicenseType } from '../../../../common/constants/security';

export const internalAuthData = Symbol('internalAuthData');
export const internalUser: FrameworkInternalUser = {
  kind: 'internal',
};

export interface XpackInfo {
  license: {
    getType: () => LicenseType;
    /** Is the license expired */
    isActive: () => boolean;
    getExpiryDateInMillis: () => number;
  };
  feature: (pluginId: string) => any;
  isAvailable: () => boolean;
}

export interface BackendFrameworkAdapter {
  internalUser: FrameworkInternalUser;
  info: null | FrameworkInfo;
  log(text: string): void;
  on(event: 'xpack.status.green' | 'elasticsearch.status.green', cb: () => void): void;
  getSetting(settingPath: string): any;
  exposeStaticDir(urlPath: string, dir: string): void;
  registerRoute<RouteRequest extends FrameworkRequest, RouteResponse extends FrameworkResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
}

export interface KibanaLegacyServer {
  plugins: {
    xpack_main: {
      status: {
        on: (status: 'green' | 'yellow' | 'red', callback: () => void) => void;
      };
      info: XpackInfo;
    };
    kibana: {
      status: {
        plugin: {
          version: string;
        };
      };
    };
    security: {
      getUser: (request: KibanaServerRequest) => any;
    };
    elasticsearch: {
      status: {
        on: (status: 'green' | 'yellow' | 'red', callback: () => void) => void;
      };
      getCluster: () => any;
    };
    beats_management: {};
  };
  config: () => any;
  route: (routeConfig: any) => void;
  log: (message: string) => void;
}

export const RuntimeFrameworkInfo = t.interface(
  {
    kibana: t.type({
      version: t.string,
    }),
    license: t.type({
      type: t.union(
        ['oss', 'trial', 'standard', 'basic', 'gold', 'platinum'].map(s => t.literal(s))
      ),
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
  },
  'FrameworkInfo'
);
export interface FrameworkInfo extends t.TypeOf<typeof RuntimeFrameworkInfo> {}

export const RuntimeKibanaServerRequest = t.interface(
  {
    params: t.object,
    payload: t.object,
    query: t.object,
    headers: t.type({
      authorization: t.union([t.string, t.null]),
    }),
    info: t.type({
      remoteAddress: t.string,
    }),
  },
  'KibanaServerRequest'
);
export interface KibanaServerRequest extends t.TypeOf<typeof RuntimeKibanaServerRequest> {}

export const RuntimeKibanaUser = t.interface(
  {
    username: t.string,
    roles: t.array(t.string),
    full_name: t.union([t.null, t.string]),
    email: t.union([t.null, t.string]),
    enabled: t.boolean,
  },
  'KibanaUser'
);
export interface KibanaUser extends t.TypeOf<typeof RuntimeKibanaUser> {}

export interface FrameworkAuthenticatedUser<AuthDataType = any> {
  kind: 'authenticated';
  [internalAuthData]: AuthDataType;
  username: string;
  roles: string[];
  full_name: string | null;
  email: string | null;
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
  KibanaServerRequestGenaric extends Partial<KibanaServerRequest> = any
> {
  user: FrameworkUser<KibanaServerRequestGenaric['headers']>;
  headers: KibanaServerRequestGenaric['headers'];
  info: KibanaServerRequest['info'];
  payload: KibanaServerRequestGenaric['payload'];
  params: KibanaServerRequestGenaric['params'];
  query: KibanaServerRequestGenaric['query'];
}

export interface FrameworkRouteOptions<
  RouteRequest extends FrameworkRequest = FrameworkRequest,
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
  RouteRequest extends KibanaServerRequest,
  RouteResponse extends FrameworkResponse
> = (request: FrameworkRequest<RouteRequest>, h: ResponseToolkit) => Promise<RouteResponse>;

export type FrameworkResponse = Lifecycle.ReturnValue;
