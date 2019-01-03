/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { FeaturePrivilegeSet } from '../../../common/model/privileges/feature_privileges';
import { PrivilegeDefinition } from '../../../common/model/privileges/privilege_definition';
import { Role } from '../../../common/model/role';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';

interface PrivilegeValidationResponse {
  allowed: boolean;
  details: string;
}

/**
 * Describes the source of a privilege.
 */
export enum PRIVILEGE_SOURCE {
  /** No privilege assigned */
  NONE,

  /** Privilege is assigned directly to the entity */
  ASSIGNED_DIRECTLY,

  /** Privilege is derived from either a space base privilege, or global base privilege */
  EFFECTIVE,

  /** Privilege was originally assigned directly, but has been superceded by a more-permissive base privilege */
  EFFECTIVE_OVERRIDES_ASSIGNED,
}

export interface ExplanationResult {
  privilege: string;
  source: PRIVILEGE_SOURCE;
  details: string;
}

/**
 * Encapsulates logic for determining which privileges are assigned at a base and feature level, for both global and space-specific privileges.
 *
 * Terminology:
 *   - Global: denotes privileges that are assigned to the "*" resource, which cascades to all current and future spaces.
 *   - Base Privilege: The privilege assigned either globally or at the space level, which cascades to all features.
 *   - Feature Privilege: The privilege assigned either globally or at the space level for a specific feature.
 */
export class EffectivePrivileges {
  // reference to the global privilege definition
  private globalPrivilege: {
    spaces?: string[];
    minimum: string[];
    feature: FeaturePrivilegeSet;
  };

  // list of privilege actions that comprise the global minimum (base) privilege
  private assignedGlobalBaseActions: string[];

  constructor(
    private readonly privilegeDefinition: PrivilegeDefinition,
    private readonly role: Role,
    private readonly rankedSpaceBasePrivileges: string[],
    private readonly rankedGlobalBasePrivileges: string[],
    private readonly rankedFeaturePrivileges: FeaturePrivilegeSet
  ) {
    this.globalPrivilege = this.locateGlobalPrivilege(role);
    this.assignedGlobalBaseActions = this.globalPrivilege.minimum[0]
      ? privilegeDefinition.getGlobalPrivileges().getActions(this.globalPrivilege.minimum[0])
      : [];
  }

  /**
   * Determines the actual global privilege assigned for a specific feature.
   *
   * @param featureId the feature id.
   */
  public getActualGlobalFeaturePrivilege(featureId: string) {
    const { feature = {} as FeaturePrivilegeSet } = this.globalPrivilege || {};
    const assignedFeaturePrivilege = feature[featureId]
      ? feature[featureId][0]
      : NO_PRIVILEGE_VALUE;

    const effectivePrivilege = this.getHighestGrantedGlobalFeaturePrivilege(featureId);

    if (assignedFeaturePrivilege !== NO_PRIVILEGE_VALUE) {
      return assignedFeaturePrivilege;
    }
    return effectivePrivilege;
  }

  public getActualSpaceFeaturePrivilege(featureId: string, spacesIndex: number) {
    return this.explainActualSpaceFeaturePrivilege(featureId, spacesIndex).privilege;
  }

  public explainActualSpaceFeaturePrivilege(
    featureId: string,
    spacesIndex: number
  ): ExplanationResult {
    const { feature = {} as FeaturePrivilegeSet } = this.role.kibana.spaces[spacesIndex] || {};
    const assignedFeaturePrivilege = feature[featureId]
      ? feature[featureId][0]
      : NO_PRIVILEGE_VALUE;

    if (assignedFeaturePrivilege === NO_PRIVILEGE_VALUE) {
      const effectivePrivilege = this.getHighestGrantedSpaceFeaturePrivilege(
        featureId,
        spacesIndex
      );

      const isSet = effectivePrivilege !== NO_PRIVILEGE_VALUE;

      return {
        privilege: effectivePrivilege,
        source: isSet ? PRIVILEGE_SOURCE.EFFECTIVE : PRIVILEGE_SOURCE.NONE,
        details: isSet ? `Granted via base privilege` : `Not assigned`,
      };
    }

    const allowsAssigned = this.validateSpaceFeaturePrivilege(
      featureId,
      assignedFeaturePrivilege,
      spacesIndex
    );

    if (allowsAssigned.allowed) {
      return {
        privilege: assignedFeaturePrivilege,
        source: PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY,
        details: 'Assigned directly',
      };
    } else {
      const effectivePrivilege = this.getHighestGrantedSpaceFeaturePrivilege(
        featureId,
        spacesIndex
      );

      return {
        privilege: effectivePrivilege,
        source: PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED,
        details: allowsAssigned.details,
      };
    }
  }

  public getActualSpaceBasePrivilege(spacesIndex: number) {
    return this.explainActualSpaceBasePrivilege(spacesIndex).privilege;
  }

  public explainActualSpaceBasePrivilege(spacesIndex: number): ExplanationResult {
    const { minimum = [] as string[] } = this.role.kibana.spaces[spacesIndex] || {};
    const globalBasePrivilege = this.globalPrivilege.minimum;

    if (minimum.length === 0) {
      const isSet = globalBasePrivilege.length > 0;

      return {
        privilege: globalBasePrivilege[0],
        source: isSet ? PRIVILEGE_SOURCE.EFFECTIVE : PRIVILEGE_SOURCE.NONE,
        details: isSet ? `Granted via global base privilege` : `Not assigned`,
      };
    }
    const allowsAssigned = this.validateSpaceBasePrivilege(minimum[0]);
    if (allowsAssigned.allowed) {
      return {
        privilege: minimum[0],
        source: PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY,
        details: `Assigned directly`,
      };
    }

    return {
      privilege: globalBasePrivilege[0],
      source: PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED,
      details: allowsAssigned.details,
    };
  }

  public allowsGlobalFeaturePrivilege(
    featureId: string,
    privilege: string
  ): PrivilegeValidationResponse {
    if (this.globalPrivilege.minimum.length === 0) {
      return {
        allowed: true,
        details: 'No global minimum privileges assigned',
      };
    }

    // test if feature covers global actions
    const candidateActions = this.privilegeDefinition
      .getFeaturePrivileges()
      .getActions(featureId, privilege);

    if (areActionsFullyCovered(candidateActions, this.assignedGlobalBaseActions)) {
      return {
        allowed: false,
        details: `Global mimimum privilege (${
          this.globalPrivilege.minimum[0]
        }) already grants all actions required by ${featureId}:${privilege}`,
      };
    }

    return {
      allowed: true,
      details: `Global mimimum privilege (${
        this.globalPrivilege.minimum[0]
      }) does not grant all actions required by ${featureId}:${privilege}`,
    };
  }

  public getHighestGrantedBasePrivilege() {
    // no assigned global minimum
    if (this.globalPrivilege.minimum.length === 0) {
      return NO_PRIVILEGE_VALUE;
    }
    const highestGranted = this.rankedSpaceBasePrivileges.find(spacePrivilege => {
      const actions = this.privilegeDefinition.getSpacesPrivileges().getActions(spacePrivilege);
      return areActionsFullyCovered(actions, this.assignedGlobalBaseActions);
    });

    if (!highestGranted) {
      return NO_PRIVILEGE_VALUE;
    }
    return highestGranted;
  }

  public getHighestGrantedGlobalFeaturePrivilege(featureId: string) {
    const { minimum = [] } = this.globalPrivilege || {};
    const baseActions = [
      ...this.assignedGlobalBaseActions,
      ...this.privilegeDefinition.getGlobalPrivileges().getActions(minimum[0]),
    ];

    const featurePrivileges = this.rankedFeaturePrivileges[featureId] || [];
    const highestGranted = featurePrivileges.find(featurePrivilege => {
      const actions = this.privilegeDefinition
        .getFeaturePrivileges()
        .getActions(featureId, featurePrivilege);

      return areActionsFullyCovered(baseActions, actions);
    });

    if (!highestGranted) {
      return NO_PRIVILEGE_VALUE;
    }
    return highestGranted;
  }

  public getHighestGrantedSpaceFeaturePrivilege(featureId: string, spacesIndex: number) {
    const { minimum = [], spaces = [] } = this.role.kibana.spaces[spacesIndex] || {};
    const globalFeaturePrivileges = this.globalPrivilege.feature[featureId] || [];

    const baseActions = [
      ...this.assignedGlobalBaseActions,
      ...this.privilegeDefinition.getSpacesPrivileges().getActions(minimum[0]),
    ];

    // TODO: temp hack-in
    if (globalFeaturePrivileges.length > 0 && !spaces.includes('*')) {
      baseActions.push(
        ...this.privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, globalFeaturePrivileges[0])
      );
    }

    const featurePrivileges = this.rankedFeaturePrivileges[featureId] || [];
    const highestGranted = featurePrivileges.find(featurePrivilege => {
      const actions = this.privilegeDefinition
        .getFeaturePrivileges()
        .getActions(featureId, featurePrivilege);

      return areActionsFullyCovered(baseActions, actions);
    });

    if (!highestGranted) {
      return NO_PRIVILEGE_VALUE;
      // throw new Error('Unexpected condition -- should have located a granted feature privilege');
    }
    return highestGranted;
  }

  public canAssignSpaceFeaturePrivilege(
    featureId: string,
    privilege: string,
    spacesIndex: number
  ): boolean {
    const { minimum = [], spaces = [] } = this.role.kibana.spaces[spacesIndex] || {};
    const globalFeaturePrivileges = this.globalPrivilege.feature[featureId] || [];

    const baseActions = [
      ...this.assignedGlobalBaseActions,
      ...this.privilegeDefinition.getSpacesPrivileges().getActions(minimum[0]),
    ];

    // TODO: temp hack-in
    if (globalFeaturePrivileges.length > 0 && !spaces.includes('*')) {
      baseActions.push(
        ...this.privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, globalFeaturePrivileges[0])
      );
    }

    const featureActions = this.privilegeDefinition
      .getFeaturePrivileges()
      .getActions(featureId, privilege);

    const isCurrentEffective =
      this.getHighestGrantedSpaceFeaturePrivilege(featureId, spacesIndex) === privilege;

    return isCurrentEffective || !areActionsFullyCovered(baseActions, featureActions);
  }

  public validateSpaceBasePrivilege(basePrivilege: string) {
    const baseActions = [
      ...this.privilegeDefinition.getSpacesPrivileges().getActions(basePrivilege),
    ];

    if (areActionsFullyCovered(this.assignedGlobalBaseActions, baseActions)) {
      return {
        allowed: false,
        details: `Global mimimum privilege (${
          this.globalPrivilege.minimum[0]
        }) already grants all actions required by space:${basePrivilege}`,
      };
    }

    return {
      allowed: true,
      details: `Global mimimum privilege (${
        this.globalPrivilege.minimum[0]
      }) does not grant all actions required by space:${basePrivilege}`,
    };
  }

  public validateSpaceFeaturePrivilege(
    featureId: string,
    privilege: string,
    spacesIndex: number
  ): PrivilegeValidationResponse {
    const { minimum = [], spaces = [] } = this.role.kibana.spaces[spacesIndex] || {};
    const globalFeaturePrivileges = this.globalPrivilege.feature[featureId] || [];

    const baseActions = [
      ...this.assignedGlobalBaseActions,
      ...this.privilegeDefinition.getSpacesPrivileges().getActions(minimum[0]),
    ];

    // TODO: temp hack-in
    if (globalFeaturePrivileges.length > 0 && !spaces.includes('*')) {
      baseActions.push(
        ...this.privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, globalFeaturePrivileges[0])
      );
    }

    const featureActions = this.privilegeDefinition
      .getFeaturePrivileges()
      .getActions(featureId, privilege);

    if (areActionsFullyCovered(baseActions, featureActions)) {
      return {
        allowed: false,
        details: `Global privileges already grant all actions required by ${featureId}:${privilege}`,
      };
    }

    return {
      allowed: true,
      details: `Global privileges do not grant all actions required by ${featureId}:${privilege}`,
    };
  }

  public allowsSpaceBasePrivilege(
    basePrivilege: string,
    spacesIndex: number
  ): PrivilegeValidationResponse {
    if (this.globalPrivilege.minimum.length === 0) {
      return {
        allowed: true,
        details: 'No global minimum privileges assigned',
      };
    }

    // test if candidate privilege is fully covered by global actions
    const candidateActions = this.privilegeDefinition
      .getSpacesPrivileges()
      .getActions(basePrivilege);

    if (areActionsFullyCovered(candidateActions, this.assignedGlobalBaseActions)) {
      return {
        allowed: false,
        details: `Global mimimum privilege (${
          this.globalPrivilege.minimum[0]
        }) already grants all actions required by ${basePrivilege}`,
      };
    }

    return {
      allowed: true,
      details: `Global mimimum privilege (${
        this.globalPrivilege.minimum[0]
      }) does not grant all actions required by ${basePrivilege}`,
    };
  }

  private locateGlobalPrivilege(role: Role) {
    const { spaces: spacePrivileges } = role.kibana;
    return (
      spacePrivileges.find(privileges => privileges.spaces.includes('*')) || {
        spaces: [] as string[],
        minimum: [] as string[],
        feature: {},
      }
    );
  }
}

function areActionsFullyCovered(candidateActions: string[], assignedActions: string[]) {
  const candidateActionExpressions = candidateActions.map(actionToRegExp);

  const hasAllActions =
    assignedActions.length > 0 &&
    assignedActions.every((assigned: string) =>
      candidateActionExpressions.some((exp: RegExp) => exp.test(assigned))
    );

  return hasAllActions;
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
