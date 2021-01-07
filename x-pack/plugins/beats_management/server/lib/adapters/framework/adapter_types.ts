/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as t from 'io-ts';
import { Headers, KibanaRequest } from 'src/core/server';

export const internalAuthData = Symbol('internalAuthData');
export const internalUser: FrameworkInternalUser = {
  kind: 'internal',
};

export interface BackendFrameworkAdapter {
  getUser(request: KibanaRequest): FrameworkUser<Headers>;
  internalUser: FrameworkInternalUser;
  info: null | FrameworkInfo;
  log(text: string): void;
}

export const RuntimeFrameworkInfo = t.interface(
  {
    kibana: t.type({
      version: t.string,
    }),
    license: t.type({
      type: t.keyof({
        oss: null,
        trial: null,
        standard: null,
        basic: null,
        gold: null,
        platinum: null,
        enterprise: null,
      }),
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
    roles: t.readonlyArray(t.string),
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
  roles: readonly string[];
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
