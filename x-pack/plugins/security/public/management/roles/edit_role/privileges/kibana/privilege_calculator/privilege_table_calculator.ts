/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaPrivileges,
  Role,
  SubFeaturePrivilege,
  SubFeaturePrivilegeGroup,
  RoleKibanaPrivilege,
  PrimaryFeaturePrivilege,
  FeaturePrivilege,
} from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';

function getPrivilegeKey(entry: RoleKibanaPrivilege) {
  return entry.spaces.join(',');
}

export class PrivilegeTableCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges) {}

  public getDisplayedPrivilege(entry: RoleKibanaPrivilege) {
    const assignedBase = this.getBasePrivilege(entry);
    return assignedBase?.id ?? 'Custom';
  }

  // Copied from privilege_form_calculator
  public getBasePrivilege(entry: RoleKibanaPrivilege) {
    const { base } = entry;

    const basePrivileges = this.kibanaPrivileges.getBasePrivileges(this.getPrivilegeScope(entry));
    return basePrivileges.find(bp => base.includes(bp.id));
  }

  private collectAssignedPrivileges(entry: RoleKibanaPrivilege) {
    if (isGlobalPrivilegeDefinition(entry)) {
      return this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([entry]);
    }

    const globalPrivilege = this.locateGlobalPrivilege(this.role);
    return this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(
      globalPrivilege ? [globalPrivilege, entry] : [entry]
    );
  }

  private locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => isGlobalPrivilegeDefinition(entry));
  }

  private getPrivilegeScope(entry: RoleKibanaPrivilege) {
    return isGlobalPrivilegeDefinition(entry) ? 'global' : 'space';
  }
}
