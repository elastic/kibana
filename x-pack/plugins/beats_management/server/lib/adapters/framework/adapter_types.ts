/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Lifecycle, ResponseToolkit } from 'hapi';
import * as t from 'io-ts';
import { PLUGIN } from 'x-pack/plugins/beats_management/common/constants';

export const internalAuthData = Symbol('internalAuthData');
export const internalUser: FrameworkInternalUser = {
  kind: 'internal',
};

export const RuntimeXpackInfo = t.type({
  license: t.type({
    getType: t.Function,
    isActive: t.Function,
    getExpiryDateInMillis: t.Function,
  }),
  feature: t.Function,
  isAvailable: t.Function,
});

export interface XpackInfo extends t.TypeOf<typeof RuntimeXpackInfo> {}

export interface BackendFrameworkAdapter {
  internalUser: FrameworkInternalUser;
  info: null | FrameworkInfo;
  log(text: string): void;
  on(event: 'xpack.status.green', cb: () => void): void;
  getSetting(settingPath: string): any;
  exposeStaticDir(urlPath: string, dir: string): void;
  registerRoute<RouteRequest extends FrameworkRequest, RouteResponse extends FrameworkResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
}

export const RuntimeKibanaLegacyServer = t.type({
  plugins: t.type({
    xpack_main: t.type({
      status: t.type({
        once: t.Function,
      }),
      info: RuntimeXpackInfo,
    }),
    kibana: t.type({
      status: t.type({
        plugin: t.type({
          version: t.string,
        }),
      }),
    }),
    security: t.type({
      getUser: t.Function,
    }),
    elasticsearch: t.type({
      getCluster: t.Function,
    }),
    [PLUGIN.ID]: t.type({}),
  }),
  config: t.Function,
  route: t.Function,
  log: t.Function,
});

export interface KibanaLegacyServer extends t.TypeOf<typeof RuntimeKibanaLegacyServer> {}

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

export const RuntimeKibanaServerRequest = t.type({
  params: t.object,
  payload: t.object,
  query: t.object,
  headers: t.type({
    authorization: t.union([t.string, t.null]),
  }),
  info: t.type({
    remoteAddress: t.string,
  }),
});
export interface KibanaServerRequest extends t.TypeOf<typeof RuntimeKibanaServerRequest> {}

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
> = (request: FrameworkRequest<RouteRequest>, h: ResponseToolkit) => void;

export type FrameworkResponse = Lifecycle.ReturnValue;
