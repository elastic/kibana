/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { KibanaPrivileges, RoleKibanaPrivilege } from '../../../common/model';
import { compareActions } from '../../../common/privilege_calculator_utils';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import { PRIVILEGE_SOURCE, PrivilegeExplanation } from './kibana_privilege_calculator_types';

export class KibanaBasePrivilegeCalculator {
  constructor(
    private readonly kibanaPrivileges: KibanaPrivileges,
    private readonly globalPrivilege: RoleKibanaPrivilege,
    private readonly assignedGlobalBaseActions: string[]
  ) {}

  public getMostPermissiveBasePrivilege(
    privilegeSpec: RoleKibanaPrivilege,
    ignoreAssigned: boolean
  ): PrivilegeExplanation {
    const assignedPrivilege = privilegeSpec.base[0] || NO_PRIVILEGE_VALUE;

    // If this is the global privilege definition, then there is nothing to supercede it.
    if (isGlobalPrivilegeDefinition(privilegeSpec)) {
      if (assignedPrivilege === NO_PRIVILEGE_VALUE || ignoreAssigned) {
        return {
          actualPrivilege: NO_PRIVILEGE_VALUE,
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: true,
        };
      }
      return {
        actualPrivilege: assignedPrivilege,
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: true,
      };
    }

    // Otherwise, check to see if the global privilege supercedes this one.
    const baseActions = [
      ...this.kibanaPrivileges.getSpacesPrivileges().getActions(assignedPrivilege),
    ];

    const globalSupercedes =
      this.hasAssignedGlobalBasePrivilege() &&
      (compareActions(this.assignedGlobalBaseActions, baseActions) < 0 || ignoreAssigned);

    if (globalSupercedes) {
      const wasDirectlyAssigned = !ignoreAssigned && baseActions.length > 0;

      return {
        actualPrivilege: this.globalPrivilege.base[0],
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
        isDirectlyAssigned: false,
        ...this.buildSupercededFields(
          wasDirectlyAssigned,
          assignedPrivilege,
          PRIVILEGE_SOURCE.SPACE_BASE
        ),
      };
    }

    if (!ignoreAssigned) {
      return {
        actualPrivilege: assignedPrivilege,
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
        isDirectlyAssigned: true,
      };
    }

    return {
      actualPrivilege: NO_PRIVILEGE_VALUE,
      actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
      isDirectlyAssigned: true,
    };
  }

  private hasAssignedGlobalBasePrivilege() {
    return this.assignedGlobalBaseActions.length > 0;
  }

  private buildSupercededFields(
    isSuperceding: boolean,
    supersededPrivilege?: string,
    supersededPrivilegeSource?: PRIVILEGE_SOURCE
  ) {
    if (!isSuperceding) {
      return {};
    }
    return {
      supersededPrivilege,
      supersededPrivilegeSource,
    };
  }
}
