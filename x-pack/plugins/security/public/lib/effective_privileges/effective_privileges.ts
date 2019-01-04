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
import { ActionSet, areActionsFullyCovered } from './effective_privileges_utils';

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
  supercededPrivilege?: string;
  overrideSource?: string;
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
      ? feature[featureId][0] || NO_PRIVILEGE_VALUE
      : NO_PRIVILEGE_VALUE;

    const effectivePrivilege = this.getHighestGrantedGlobalFeaturePrivilege(featureId);

    if (assignedFeaturePrivilege !== NO_PRIVILEGE_VALUE) {
      return assignedFeaturePrivilege;
    }
    return effectivePrivilege;
  }

  /**
   * Determines the actual feature privilege.
   *
   * Returns the privilege (or NO_PRIVILEGE_VALUE) that is the most permissive of the following:
   * - Global base privilege
   * - Global feature privilege
   * - Space base privilege
   * - Space feature privilege
   *
   * @param featureId
   * @param spacesIndex
   */
  public getActualSpaceFeaturePrivilege(featureId: string, spacesIndex: number) {
    return this.explainActualSpaceFeaturePrivilege(featureId, spacesIndex).privilege;
  }

  /**
   * Determines the actual feature privilege with an explanation of how the decision was made.
   *
   * Returns the privilege (or NO_PRIVILEGE_VALUE) that is the most permissive of the following:
   * - Global base privilege
   * - Global feature privilege
   * - Space base privilege
   * - Space feature privilege
   *
   * @param featureId
   * @param spacesIndex
   */
  public explainActualSpaceFeaturePrivilege(
    featureId: string,
    spacesIndex: number
  ): ExplanationResult {
    const { feature = {} as FeaturePrivilegeSet } = this.role.kibana.spaces[spacesIndex] || {};
    const assignedFeaturePrivilege = feature[featureId]
      ? feature[featureId][0] || NO_PRIVILEGE_VALUE
      : NO_PRIVILEGE_VALUE;

    const { minimum = [], spaces = [] } = this.role.kibana.spaces[spacesIndex] || {};
    const globalFeaturePrivileges = this.globalPrivilege.feature[featureId] || [];

    const scenarios: ActionSet[] = [
      {
        name: 'global base privilege',
        actions: this.assignedGlobalBaseActions,
      },
      {
        name: 'space base privilege',
        actions: this.privilegeDefinition.getSpacesPrivileges().getActions(minimum[0]),
      },
    ];

    if (globalFeaturePrivileges.length > 0 && !spaces.includes('*')) {
      scenarios.push({
        name: 'global feature privilege',
        actions: this.privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, globalFeaturePrivileges[0]),
      });
    }

    const hasAssignedFeaturePrivilege = assignedFeaturePrivilege !== NO_PRIVILEGE_VALUE;
    let spaceFeaturePrivilegeScenario: ActionSet | null = null;

    if (hasAssignedFeaturePrivilege) {
      spaceFeaturePrivilegeScenario = {
        name: 'space feature privilege',
        actions: this.privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, assignedFeaturePrivilege),
      };
      scenarios.push(spaceFeaturePrivilegeScenario);
    }

    const winningScenario = this.locateHighestGrantedFeaturePrivilege(featureId, scenarios);
    if (!winningScenario) {
      return {
        privilege: NO_PRIVILEGE_VALUE,
        source: PRIVILEGE_SOURCE.NONE,
        details: 'No feature privilege assigned',
      };
    }

    if (
      spaceFeaturePrivilegeScenario &&
      winningScenario.scenario === spaceFeaturePrivilegeScenario
    ) {
      return {
        privilege: assignedFeaturePrivilege,
        source: PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY,
        details: 'Assigned directly',
      };
    }

    return {
      privilege: winningScenario.privilege,
      supercededPrivilege: hasAssignedFeaturePrivilege ? assignedFeaturePrivilege : undefined,
      overrideSource: hasAssignedFeaturePrivilege ? winningScenario.scenario.name : undefined,
      source: hasAssignedFeaturePrivilege
        ? PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED
        : PRIVILEGE_SOURCE.EFFECTIVE,
      details: `Granted via ${winningScenario.scenario.name}`,
    };
  }

  /**
   * Determines the actual base privilege.
   *
   * Returns the privilege (or NO_PRIVILEGE_VALUE) that is the most permissive of the following:
   * - Global base privilege
   * - Space base privilege
   *
   * @param spacesIndex
   */
  public getActualSpaceBasePrivilege(spacesIndex: number) {
    return this.explainActualSpaceBasePrivilege(spacesIndex).privilege;
  }

  /**
   * Determines the actual base privilege with an explanation of how the decision was made.
   *
   * Returns the privilege (or NO_PRIVILEGE_VALUE) that is the most permissive of the following:
   * - Global base privilege
   * - Space base privilege
   *
   * @param spacesIndex
   */
  public explainActualSpaceBasePrivilege(spacesIndex: number): ExplanationResult {
    const { minimum = [] as string[] } = this.role.kibana.spaces[spacesIndex] || {};
    const globalBasePrivilege = this.globalPrivilege.minimum;

    if (minimum.length === 0) {
      const isSet = globalBasePrivilege.length > 0;

      return {
        privilege: isSet ? globalBasePrivilege[0] : NO_PRIVILEGE_VALUE,
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
      supercededPrivilege: minimum[0],
      overrideSource: 'global base privilege',
      source: PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED,
      details: allowsAssigned.details,
    };
  }

  /**
   * Determines if the specified feature privilege can be assigned, based on the other privileges that may be in play:
   * - Global base privilege
   * - Global feature privilege
   * - Space base privilege
   *
   * @param featureId
   * @param privilege
   * @param spacesIndex
   */
  public canAssignSpaceFeaturePrivilege(
    featureId: string,
    privilege: string,
    spacesIndex: number
  ): boolean {
    const actualPrivilegeDetails = this.explainActualSpaceFeaturePrivilege(featureId, spacesIndex);

    // Are we currently unassigned or self-assigned?
    if (
      [PRIVILEGE_SOURCE.NONE, PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY].includes(
        actualPrivilegeDetails.source
      )
    ) {
      return true;
    }

    // Are we trying to assign the effective privilege we already have?
    if (actualPrivilegeDetails.privilege === privilege) {
      return true;
    }

    // Now it gets tricky.
    const featureActions = this.privilegeDefinition
      .getFeaturePrivileges()
      .getActions(featureId, privilege);

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

    return !areActionsFullyCovered(baseActions, featureActions);
  }

  private validateSpaceBasePrivilege(basePrivilege: string): PrivilegeValidationResponse {
    const globalBase = this.globalPrivilege.minimum[0] || NO_PRIVILEGE_VALUE;
    if (globalBase === NO_PRIVILEGE_VALUE) {
      // nothing to do
      return {
        allowed: true,
        details: `Global mimimum privilege not set.`,
      };
    }

    if (globalBase === basePrivilege) {
      // privileges match, this is allowed
      return {
        allowed: true,
        details: `Global mimimum privilege matches space base privilege.`,
      };
    }

    const baseActions = [
      ...this.privilegeDefinition.getSpacesPrivileges().getActions(basePrivilege),
    ];

    if (areActionsFullyCovered(this.assignedGlobalBaseActions, baseActions)) {
      return {
        allowed: false,
        details: `Global mimimum privilege (${globalBase}) already grants all actions required by space:${basePrivilege}`,
      };
    }

    return {
      allowed: true,
      details: `Global mimimum privilege (${globalBase}) does not grant all actions required by space:${basePrivilege}`,
    };
  }

  private getHighestGrantedGlobalFeaturePrivilege(featureId: string) {
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

  private locateHighestGrantedFeaturePrivilege(
    featureId: string,
    scenarios: ActionSet[]
  ): { scenario: ActionSet; privilege: string } | null {
    const featurePrivileges = this.rankedFeaturePrivileges[featureId] || [];

    // inspect feature privileges in ranked order (most permissive -> least permissive)
    for (const featurePrivilege of featurePrivileges) {
      const actions = this.privilegeDefinition
        .getFeaturePrivileges()
        .getActions(featureId, featurePrivilege);

      // check if any of the scenarios satisfy the privilege - first one wins.
      for (const scenario of scenarios) {
        if (areActionsFullyCovered(scenario.actions, actions)) {
          return {
            scenario,
            privilege: featurePrivilege,
          };
        }
      }
    }

    return null;
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
