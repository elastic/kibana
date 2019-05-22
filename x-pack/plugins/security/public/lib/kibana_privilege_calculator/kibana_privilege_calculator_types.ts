/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Describes the source of a privilege.
 */
export enum PRIVILEGE_SOURCE {
  /** Privilege is assigned directly to the entity */
  SPACE_FEATURE = 10,

  /** Privilege is derived from space base privilege */
  SPACE_BASE = 20,

  /** Privilege is derived from global feature privilege */
  GLOBAL_FEATURE = 30,

  /** Privilege is derived from global base privilege */
  GLOBAL_BASE = 40,
}

export interface PrivilegeExplanation {
  actualPrivilege: string;
  actualPrivilegeSource: PRIVILEGE_SOURCE;
  isDirectlyAssigned: boolean;
  supersededPrivilege?: string;
  supersededPrivilegeSource?: PRIVILEGE_SOURCE;
}

export interface CalculatedPrivilege {
  base: PrivilegeExplanation;
  feature: {
    [featureId: string]: PrivilegeExplanation | undefined;
  };
  reserved: undefined | string[];
}

export interface PrivilegeScenario {
  actualPrivilegeSource: PRIVILEGE_SOURCE;
  isDirectlyAssigned: boolean;
  supersededPrivilege?: string;
  supersededPrivilegeSource?: PRIVILEGE_SOURCE;
  actions: string[];
}

export interface AllowedPrivilege {
  base: {
    privileges: string[];
    canUnassign: boolean;
  };
  feature: {
    [featureId: string]:
      | {
          privileges: string[];
          canUnassign: boolean;
        }
      | undefined;
  };
}
