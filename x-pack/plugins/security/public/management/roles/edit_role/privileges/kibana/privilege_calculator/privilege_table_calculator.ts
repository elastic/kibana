/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivileges, Role, RoleKibanaPrivilege } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';

export class PrivilegeTableCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges, private readonly role: Role) {}

  public getDisplayedPrivilege(entry: RoleKibanaPrivilege) {
    const assignedBase = this.getBasePrivilege(entry);
    return assignedBase?.id ?? 'Custom';
  }

  // Copied from privilege_form_calculator
  public getBasePrivilege(entry: RoleKibanaPrivilege) {
    const { base } = entry;

    const basePrivileges = this.kibanaPrivileges.getBasePrivileges(entry);
    return basePrivileges.find(bp => base.includes(bp.id));
  }

  // Copied from privilege_form_calculator
  public hasSupersededInheritedPrivileges(entry: RoleKibanaPrivilege) {
    const global = this.locateGlobalPrivilege(this.role);

    if (isGlobalPrivilegeDefinition(entry) || !global) {
      return false;
    }

    const globalPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      global,
    ]);

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([entry]);

    const basePrivileges = this.kibanaPrivileges.getBasePrivileges(entry);
    const featurePrivileges = this.kibanaPrivileges.getSecuredFeatures().map(f => f.allPrivileges);

    return [basePrivileges, featurePrivileges].flat(2).some(p => {
      const globalCheck = globalPrivileges.grantsPrivilege(p);
      const formCheck = formPrivileges.grantsPrivilege(p);
      const isSuperseded = globalCheck.hasAllRequested && !formCheck.hasAllRequested;
      return isSuperseded;
    });
  }

  private locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => isGlobalPrivilegeDefinition(entry));
  }
}
