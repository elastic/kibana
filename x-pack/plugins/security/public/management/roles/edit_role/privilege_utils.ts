/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleKibanaPrivilege } from '../../../../common/model';

/**
 * Determines if the passed privilege spec defines global privileges.
 * @param privilegeSpec
 */
export function isGlobalPrivilegeDefinition(privilegeSpec: RoleKibanaPrivilege): boolean {
  if (!privilegeSpec.spaces || privilegeSpec.spaces.length === 0) {
    return true;
  }
  return privilegeSpec.spaces.includes('*');
}
