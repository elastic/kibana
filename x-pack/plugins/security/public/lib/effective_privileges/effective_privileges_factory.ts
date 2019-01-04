/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { PrivilegeDefinition } from '../../../common/model/privileges/privilege_definition';
import { Role } from '../../../common/model/role';
import { EffectivePrivileges } from './effective_privileges';
import { compareActions } from './effective_privileges_utils';

export class EffectivePrivilegesFactory {
  /** All space base privileges, sorted from most permissive => least permissive. */
  public readonly rankedSpaceBasePrivileges: string[];

  /** All global base privileges, sorted from most permissive => least permissive. */
  public readonly rankedGlobalBasePrivileges: string[];

  /** All feature privileges, sorted from most permissive => least permissive. */
  public readonly rankedFeaturePrivileges: {
    [featureId: string]: string[];
  };

  constructor(private readonly privilegeDefinition: PrivilegeDefinition) {
    this.rankedGlobalBasePrivileges = privilegeDefinition
      .getGlobalPrivileges()
      .getAllPrivileges()
      .sort((privilege1, privilege2) => {
        const privilege1Actions = privilegeDefinition.getGlobalPrivileges().getActions(privilege1);
        const privilege2Actions = privilegeDefinition.getGlobalPrivileges().getActions(privilege2);
        return compareActions(privilege1Actions, privilege2Actions);
      });

    this.rankedSpaceBasePrivileges = privilegeDefinition
      .getSpacesPrivileges()
      .getAllPrivileges()
      .sort((privilege1, privilege2) => {
        const privilege1Actions = privilegeDefinition.getSpacesPrivileges().getActions(privilege1);
        const privilege2Actions = privilegeDefinition.getSpacesPrivileges().getActions(privilege2);
        return compareActions(privilege1Actions, privilege2Actions);
      });

    this.rankedFeaturePrivileges = {};
    const featurePrivilegeSet = privilegeDefinition.getFeaturePrivileges().getAllPrivileges();
    Object.entries(featurePrivilegeSet).forEach(([featureId, privileges]) => {
      this.rankedFeaturePrivileges[featureId] = privileges.sort((privilege1, privilege2) => {
        const privilege1Actions = privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, privilege1);
        const privilege2Actions = privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, privilege2);
        return compareActions(privilege1Actions, privilege2Actions);
      });
    });
  }

  /**
   * Creates an EffectivePrivileges instance for the specified role.
   * @param role
   */
  public getInstance(role: Role) {
    return new EffectivePrivileges(
      this.privilegeDefinition,
      role,
      this.rankedSpaceBasePrivileges,
      this.rankedGlobalBasePrivileges,
      this.rankedFeaturePrivileges
    );
  }
}
