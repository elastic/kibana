/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Role } from '../../common/model/role';

/**
 * Returns whether given role is enabled or not
 *
 * @param role Object Role JSON, as returned by roles API
 * @return Boolean true if role is enabled; false otherwise
 */
export function isRoleEnabled(role: Partial<Role>) {
  return get(role, 'transient_metadata.enabled', true);
}

/**
 * Returns whether given role is reserved or not.
 *
 * @param {role} the Role as returned by roles API
 */
export function isReservedRole(role: Partial<Role>) {
  return get(role, 'metadata._reserved', false);
}
