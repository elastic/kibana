/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { FeaturesPrivileges } from './features_privileges';

export interface RoleIndexPrivilege {
  names: string[];
  privileges: string[];
  field_security?: {
    grant?: string[];
    except?: string[];
  };
  query?: string;
}

export interface RoleKibanaPrivilege {
  spaces: string[];
  base: string[];
  feature: FeaturesPrivileges;
  _reserved?: string[];
}

export interface Role {
  name: string;
  elasticsearch: {
    cluster: string[];
    indices: RoleIndexPrivilege[];
    run_as: string[];
  };
  kibana: RoleKibanaPrivilege[];
  metadata?: {
    [anyKey: string]: any;
  };
  transient_metadata?: {
    [anyKey: string]: any;
  };
  _transform_error?: string[];
  _unrecognized_applications?: string[];
}

/**
 * Returns whether given role is enabled or not
 *
 * @param role Object Role JSON, as returned by roles API
 * @return Boolean true if role is enabled; false otherwise
 */
export function isRoleEnabled(role: Partial<Role>) {
  return role.transient_metadata?.enabled ?? true;
}

/**
 * Returns whether given role is reserved or not.
 *
 * @param role Role as returned by roles API
 */
export function isReservedRole(role: Partial<Role>) {
  return (role.metadata?._reserved as boolean) ?? false;
}

/**
 * Returns whether given role is editable through the UI or not.
 *
 * @param role the Role as returned by roles API
 */
export function isReadOnlyRole(role: Partial<Role>): boolean {
  return isReservedRole(role) || (role._transform_error?.length ?? 0) > 0;
}

/**
 * Returns a deep copy of the role.
 *
 * @param role the Role to copy.
 */
export function copyRole(role: Role) {
  return cloneDeep(role);
}

/**
 * Creates a deep copy of the role suitable for cloning.
 *
 * @param role the Role to clone.
 */
export function prepareRoleClone(role: Role): Role {
  const clone = copyRole(role);

  clone.name = '';

  return clone;
}
