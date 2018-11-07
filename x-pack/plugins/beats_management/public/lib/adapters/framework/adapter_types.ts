/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export interface FrameworkAdapter {
  // Instance vars
  info?: FrameworkInfo | null;
  currentUser: FrameworkUser;
  // Methods
  renderUIAtPath(path: string, component: React.ReactElement<any>): Promise<void>;
  registerManagementSection(settings: {
    id?: string;
    name: string;
    iconName: string;
    order?: number;
  }): void;
  registerManagementUI(settings: {
    id?: string;
    name: string;
    basePath: string;
    visable?: boolean;
    order?: number;
  }): void;
  setUISettings(key: string, value: any): void;
}

export const RuntimeFrameworkInfo = t.type({
  basePath: t.string,
  license: t.type({
    type: t.union(['oss', 'trial', 'standard', 'basic', 'gold', 'platinum'].map(s => t.literal(s))),
    expired: t.boolean,
    expiry_date_in_millis: t.number,
  }),
  security: t.type({
    enabled: t.boolean,
    available: t.boolean,
  }),
});
export interface FrameworkInfo extends t.TypeOf<typeof RuntimeFrameworkInfo> {}

export interface FrameworkUser {
  email: string | null;
  enabled: boolean;
  full_name: string | null;
  metadata: { _reserved: true };
  roles: string[];
  scope: string[];
  username: string;
}
