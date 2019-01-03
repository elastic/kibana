/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { PrivilegeDefinition } from '../../../common/model/privileges/privilege_definition';
import { Role } from '../../../common/model/role';
import { EffectivePrivileges } from './effective_privileges';

export class EffectivePrivilegesFactory {
  private rankedSpaceBasePrivileges: string[];

  private rankedGlobalBasePrivileges: string[];

  private rankedFeaturePrivileges: {
    [featureId: string]: string[];
  };

  constructor(private readonly privilegeDefinition: PrivilegeDefinition) {
    this.rankedGlobalBasePrivileges = privilegeDefinition
      .getGlobalPrivileges()
      .getAllPrivileges()
      .sort((privilege1, privilege2) => {
        const privilege1Actions = privilegeDefinition.getGlobalPrivileges().getActions(privilege1);
        const privilege2Actions = privilegeDefinition.getGlobalPrivileges().getActions(privilege2);
        if (areActionsFullyCovered(privilege2Actions, privilege1Actions)) {
          return 1;
        }
        if (areActionsFullyCovered(privilege1Actions, privilege2Actions)) {
          return -1;
        }
        throw new Error(`Stalemate! Expected all global privileges to be hierarchical!`);
      });

    this.rankedSpaceBasePrivileges = privilegeDefinition
      .getSpacesPrivileges()
      .getAllPrivileges()
      .sort((privilege1, privilege2) => {
        const privilege1Actions = privilegeDefinition.getSpacesPrivileges().getActions(privilege1);
        const privilege2Actions = privilegeDefinition.getSpacesPrivileges().getActions(privilege2);
        if (areActionsFullyCovered(privilege2Actions, privilege1Actions)) {
          return 1;
        }
        if (areActionsFullyCovered(privilege1Actions, privilege2Actions)) {
          return -1;
        }
        throw new Error(`Stalemate! Expected all space privileges to be hierarchical!`);
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
        if (areActionsFullyCovered(privilege2Actions, privilege1Actions)) {
          return 1;
        }
        if (areActionsFullyCovered(privilege1Actions, privilege2Actions)) {
          return -1;
        }
        throw new Error(`Stalemate! Expected all feature privileges to be hierarchical!`);
      });
    });
  }

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

function actionToRegExp(action: string) {
  // Actions are strings that may or may not end with a wildcard ("*").
  // This will excape all characters in the action string that are not the wildcard character.
  // Each wildcard character is then turned into a ".*" before the entire thing is turned into a regexp.
  return new RegExp(
    action
      .split('*')
      .map(part => _.escapeRegExp(part))
      .join('.*')
  );
}

function areActionsFullyCovered(candidateActions: string[], assignedActions: string[]) {
  const candidateActionExpressions = candidateActions.map(actionToRegExp);

  const hasAllActions = assignedActions.every((assigned: string) =>
    candidateActionExpressions.some((exp: RegExp) => exp.test(assigned))
  );

  return hasAllActions;
}
