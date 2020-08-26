/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as t from 'io-ts';
import { LICENSES } from '../../../../common/constants/security';
import { RegisterManagementAppArgs } from '../../../../../../../src/plugins/management/public';

export interface FrameworkAdapter {
  // Instance vars
  info: FrameworkInfo;
  version: string;
  currentUser: FrameworkUser;
  // Methods
  waitUntilFrameworkReady(): Promise<void>;
  registerManagementUI(mount: RegisterManagementAppArgs['mount']): void;
}

export const RuntimeFrameworkInfo = t.type({
  basePath: t.string,
  license: t.type({
    type: t.keyof(Object.fromEntries(LICENSES.map((s) => [s, null])) as Record<string, null>),
    expired: t.boolean,
    expiry_date_in_millis: t.number,
  }),
  security: t.type({
    enabled: t.boolean,
    available: t.boolean,
  }),
  settings: t.type({
    encryptionKey: t.string,
    enrollmentTokensTtlInSeconds: t.number,
    defaultUserRoles: t.array(t.string),
  }),
});

export interface FrameworkInfo extends t.TypeOf<typeof RuntimeFrameworkInfo> {}

export const RuntimeFrameworkUser = t.interface(
  {
    username: t.string,
    roles: t.readonlyArray(t.string),
    full_name: t.union([t.null, t.string]),
    email: t.union([t.null, t.string]),
    enabled: t.boolean,
  },
  'FrameworkUser'
);
export interface FrameworkUser extends t.TypeOf<typeof RuntimeFrameworkUser> {}
