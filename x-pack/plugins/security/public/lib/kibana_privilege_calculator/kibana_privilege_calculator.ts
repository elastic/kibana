/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  FeaturePrivilegeSet,
  KibanaPrivilegeSpec,
  PrivilegeDefinition,
  Role,
} from '../../../common/model';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import { KibanaAllowedPrivilegesCalculator } from './kibana_allowed_privileges_calculator';
import { KibanaBasePrivilegeCalculator } from './kibana_base_privilege_calculator';
import { KibanaFeaturePrivilegeCalculator } from './kibana_feature_privilege_calculator';
import { AllowedPrivilege, CalculatedPrivilege } from './kibana_privilege_calculator_types';

export class KibanaPrivilegeCalculator {
  // reference to the global privilege definition
  private globalPrivilege: KibanaPrivilegeSpec;

  private allowedPrivilegesCalculator: KibanaAllowedPrivilegesCalculator;

  private effectiveBasePrivilegesCalculator: KibanaBasePrivilegeCalculator;

  private effectiveFeaturePrivilegesCalculator: KibanaFeaturePrivilegeCalculator;

  constructor(
    private readonly privilegeDefinition: PrivilegeDefinition,
    private readonly role: Role,
    public readonly rankedFeaturePrivileges: FeaturePrivilegeSet
  ) {
    this.globalPrivilege = this.locateGlobalPrivilege(role);

    this.allowedPrivilegesCalculator = new KibanaAllowedPrivilegesCalculator(
      privilegeDefinition,
      role
    );

    this.effectiveBasePrivilegesCalculator = new KibanaBasePrivilegeCalculator(
      privilegeDefinition,
      this.globalPrivilege
    );

    this.effectiveFeaturePrivilegesCalculator = new KibanaFeaturePrivilegeCalculator(
      privilegeDefinition,
      this.globalPrivilege,
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
    privilegeSpec: KibanaPrivilegeSpec,
    ignoreAssigned: boolean
  ): CalculatedPrivilege {
    const result: CalculatedPrivilege = {
      base: this.effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(
        privilegeSpec,
        ignoreAssigned
      ),
      feature: {},
    };

    // If calculations wish to ignoreAssigned, then we still need to know what the real effective base privilege is
    // without ignoring assigned, in order to calculate the correct feature privileges.
    const effectiveBase = ignoreAssigned
      ? this.effectiveBasePrivilegesCalculator.getMostPermissiveBasePrivilege(privilegeSpec, false)
      : result.base;

    const allFeaturePrivileges = this.privilegeDefinition.getFeaturePrivileges().getAllPrivileges();
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
