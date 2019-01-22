/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { KibanaPrivilegeSpec, PrivilegeDefinition } from '../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import { PRIVILEGE_SOURCE, PrivilegeExplanation } from './kibana_privilege_calculator_types';
import { compareActions } from './privilege_calculator_utils';

export class KibanaBasePrivilegeCalculator {
  // list of privilege actions that comprise the global base privilege
  private assignedGlobalBaseActions: string[];

  constructor(
    private readonly privilegeDefinition: PrivilegeDefinition,
    private readonly globalPrivilege: KibanaPrivilegeSpec
  ) {
    this.assignedGlobalBaseActions = this.globalPrivilege.base[0]
      ? privilegeDefinition.getGlobalPrivileges().getActions(this.globalPrivilege.base[0])
      : [];
  }

  public getMostPermissiveBasePrivilege(
    privilegeSpec: KibanaPrivilegeSpec,
    ignoreAssigned: boolean
  ): PrivilegeExplanation {
    const assignedPrivilege = privilegeSpec.base[0] || NO_PRIVILEGE_VALUE;

    // If this is the global privilege definition, then there is nothing to supercede it.
    if (isGlobalPrivilegeDefinition(privilegeSpec)) {
      if (assignedPrivilege === NO_PRIVILEGE_VALUE || ignoreAssigned) {
        return {
          actualPrivilege: assignedPrivilege,
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
      ...this.privilegeDefinition.getSpacesPrivileges().getActions(assignedPrivilege),
    ];

    const globalSupercedes =
      this.hasAssignedGlobalBasePrivilege() &&
      (compareActions(this.assignedGlobalBaseActions, baseActions) < 0 || ignoreAssigned);

    if (globalSupercedes) {
      const wasDirectlyAssigned = baseActions.length > 0;

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
    supercededPrivilege?: string,
    supercededPrivilegeSource?: PRIVILEGE_SOURCE
  ) {
    if (!isSuperceding) {
      return {};
    }
    return {
      supercededPrivilege,
      supercededPrivilegeSource,
    };
  }
}
