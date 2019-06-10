/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  FeaturesPrivileges,
  KibanaPrivileges,
  Role,
  RoleKibanaPrivilege,
} from '../../../common/model';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import { KibanaAllowedPrivilegesCalculator } from './kibana_allowed_privileges_calculator';
import { KibanaBasePrivilegeCalculator } from './kibana_base_privilege_calculator';
import { KibanaFeaturePrivilegeCalculator } from './kibana_feature_privilege_calculator';
import { AllowedPrivilege, CalculatedPrivilege } from './kibana_privilege_calculator_types';

export class KibanaPrivilegeCalculator {
  private allowedPrivilegesCalculator: KibanaAllowedPrivilegesCalculator;

  private effectiveBasePrivilegesCalculator: KibanaBasePrivilegeCalculator;

  private effectiveFeaturePrivilegesCalculator: KibanaFeaturePrivilegeCalculator;

  constructor(
    private readonly kibanaPrivileges: KibanaPrivileges,
    private readonly role: Role,
    public readonly rankedFeaturePrivileges: FeaturesPrivileges
  ) {
    const globalPrivilege = this.locateGlobalPrivilege(role);

    const assignedGlobalBaseActions: string[] = globalPrivilege.base[0]
      ? kibanaPrivileges.getGlobalPrivileges().getActions(globalPrivilege.base[0])
      : [];

    this.allowedPrivilegesCalculator = new KibanaAllowedPrivilegesCalculator(
      kibanaPrivileges,
      role
    );

    this.effectiveBasePrivilegesCalculator = new KibanaBasePrivilegeCalculator(
      kibanaPrivileges,
      globalPrivilege,
      assignedGlobalBaseActions
    );

    this.effectiveFeaturePrivilegesCalculator = new KibanaFeaturePrivilegeCalculator(
      kibanaPrivileges,
      globalPrivilege,
      assignedGlobalBaseActions,
      rankedFeaturePrivileges
    );
  }

  public calculateEffectivePrivileges(ignoreAssigned: boolean = false): CalculatedPrivilege[] {
    const { kibana = [] } = this.role;
    return kibana.map(privilegeSpec =>
      this.calculateEffectivePrivilege(privilegeSpec, ignoreAssigned)
    );
  }

  public calculateAllowedPrivileges(): AllowedPrivilege[] {
    const effectivePrivs = this.calculateEffectivePrivileges(true);
    return this.allowedPrivilegesCalculator.calculateAllowedPrivileges(effectivePrivs);
  }

  private calculateEffectivePrivilege(
    privilegeSpec: RoleKibanaPrivilege,
    ignoreAssigned: boolean
  ): CalculatedPrivilege {
    const result: CalculatedPrivilege = {
      base: this.effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        privilegeSpec,
        ignoreAssigned
      ),
      feature: {},
      reserved: privilegeSpec._reserved,
    };

    // If calculations wish to ignoreAssigned, then we still need to know what the real effective base privilege is
    // without ignoring assigned, in order to calculate the correct feature privileges.
    const effectiveBase = ignoreAssigned
      ? this.effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(privilegeSpec, false)
      : result.base;

    const allFeaturePrivileges = this.kibanaPrivileges.getFeaturePrivileges().getAllPrivileges();
    result.feature = Object.keys(allFeaturePrivileges).reduce((acc, featureId) => {
      return {
        ...acc,
        [featureId]: this.effectiveFeaturePrivilegesCalculator.getMostPermissiveFeaturePrivilege(
          privilegeSpec,
          effectiveBase,
          featureId,
          ignoreAssigned
        ),
      };
    }, {});

    return result;
  }

  private locateGlobalPrivilege(role: Role) {
    const spacePrivileges = role.kibana;
    return (
      spacePrivileges.find(privileges => isGlobalPrivilegeDefinition(privileges)) || {
        spaces: [] as string[],
        base: [] as string[],
        feature: {},
      }
    );
  }
}
