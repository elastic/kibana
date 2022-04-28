/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

export interface HasPrivilegesResponseApplication {
  [resource: string]: {
    [privilegeName: string]: boolean;
  };
}

export interface HasPrivilegesResponse {
  has_all_requested: boolean;
  username: string;
  application: {
    [applicationName: string]: HasPrivilegesResponseApplication;
  };
  cluster?: {
    [privilegeName: string]: boolean;
  };
  index?: {
    [indexName: string]: {
      [privilegeName: string]: boolean;
    };
  };
}

/**
 * Options to influce the privilege checks.
 */
export interface CheckPrivilegesOptions {
  /**
   * Whether or not the `login` action should be required (default: true).
   * Setting this to false is not advised except for special circumstances, when you do not require
   * the request to belong to a user capable of logging into Kibana.
   */
  requireLoginAction?: boolean;
}

export interface CheckPrivilegesResponse {
  hasAllRequested: boolean;
  username: string;
  privileges: {
    kibana: Array<{
      /**
       * If this attribute is undefined, this element is a privilege for the global resource.
       */
      resource?: string;
      privilege: string;
      authorized: boolean;
    }>;
    elasticsearch: {
      cluster: Array<{
        privilege: string;
        authorized: boolean;
      }>;
      index: {
        [indexName: string]: Array<{
          privilege: string;
          authorized: boolean;
        }>;
      };
    };
  };
}

export type CheckPrivilegesWithRequest = (request: KibanaRequest) => CheckPrivileges;

export interface CheckPrivileges {
  atSpace(
    spaceId: string,
    privileges: CheckPrivilegesPayload,
    options?: CheckPrivilegesOptions
  ): Promise<CheckPrivilegesResponse>;
  atSpaces(
    spaceIds: string[],
    privileges: CheckPrivilegesPayload,
    options?: CheckPrivilegesOptions
  ): Promise<CheckPrivilegesResponse>;
  globally(
    privileges: CheckPrivilegesPayload,
    options?: CheckPrivilegesOptions
  ): Promise<CheckPrivilegesResponse>;
}

export interface CheckPrivilegesPayload {
  kibana?: string | string[];
  elasticsearch?: {
    cluster: string[];
    index: Record<string, string[]>;
  };
}
