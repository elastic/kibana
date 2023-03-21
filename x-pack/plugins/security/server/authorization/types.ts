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

/**
 * Privileges that can be checked for the Kibana users.
 */
export interface CheckPrivilegesPayload {
  /**
   * A list of the Kibana specific privileges (usually generated with `security.authz.actions.*.get(...)`).
   */
  kibana?: string | string[];
  /**
   * A set of the Elasticsearch cluster and index privileges.
   */
  elasticsearch?: {
    /**
     * A list of Elasticsearch cluster privileges (`manage_security`, `create_snapshot` etc.).
     */
    cluster: string[];
    /**
     * A map (index name <-> list of privileges) of Elasticsearch index privileges (`view_index_metadata`, `read` etc.).
     */
    index: Record<string, string[]>;
  };
}

/**
 * An interface to check users profiles privileges in a specific context (only a single-space context is supported at
 * the moment).
 */
export interface CheckUserProfilesPrivileges {
  atSpace(
    spaceId: string,
    privileges: CheckUserProfilesPrivilegesPayload
  ): Promise<CheckUserProfilesPrivilegesResponse>;
}

/**
 * Privileges that can be checked for the users profiles (only Kibana specific privileges are supported at the moment).
 */
export interface CheckUserProfilesPrivilegesPayload {
  /**
   * A list of the Kibana specific privileges (usually generated with `security.authz.actions.*.get(...)`).
   */
  kibana: string[];
}

/**
 * Response of the check privileges operation for the users profiles.
 */
export interface CheckUserProfilesPrivilegesResponse {
  /**
   * The subset of the requested profile IDs of the users that have all the requested privileges.
   */
  hasPrivilegeUids: string[];

  /**
   * An errors object that may be returned from ES that contains a `count` of UIDs that have errors in the `details` property.
   *
   * Each entry in `details` will contain an error `type`, e.g 'resource_not_found_exception', and a `reason` message, e.g. 'profile document not found'
   */
  errors?: {
    count: number;
    details: Record<string, { type: string; reason: string }>;
  };
}
