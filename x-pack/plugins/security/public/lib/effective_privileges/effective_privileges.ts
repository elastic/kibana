/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { FeaturePrivilegeSet, PrivilegeDefinition, Role } from '../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import { ActionSet, areActionsFullyCovered } from './effective_privileges_utils';

interface PrivilegeValidationResponse {
  allowed: boolean;
  details: string;
}

interface PrivilegeScenario extends ActionSet {
  source: PRIVILEGE_SOURCE;
}

/**
 * Describes the source of a privilege.
 */
export enum PRIVILEGE_SOURCE {
  /** No privilege assigned */
  NONE,

  /** Privilege is assigned directly to the entity */
  ASSIGNED_DIRECTLY,

  /** Privilege is derived from space base privilege */
  EFFECTIVE_SPACE_BASE,

  /** Privilege is derived from global base privilege */
  EFFECTIVE_GLOBAL_BASE,

  /** Privilege is derived from global feature privilege */
  EFFECTIVE_GLOBAL_FEATURE,
}

export interface ExplanationResult {
  privilege: string;
  supercededPrivilege?: string;
  overrideSource?: string;
  source: PRIVILEGE_SOURCE;
  overridesAssigned?: boolean;
  details: string;
}

/**
 * Encapsulates logic for determining which privileges are assigned at a base and feature level, for both global and space-specific privileges.
 */
export class EffectivePrivileges {
  // reference to the global privilege definition
  private globalPrivilege: {
    spaces?: string[];
    base: string[];
    feature: FeaturePrivilegeSet;
  };

  // list of privilege actions that comprise the global base privilege
  private assignedGlobalBaseActions: string[];

  constructor(
    private readonly privilegeDefinition: PrivilegeDefinition,
    private readonly role: Role,
    public readonly rankedFeaturePrivileges: FeaturePrivilegeSet
  ) {
    this.globalPrivilege = this.locateGlobalPrivilege(role);
    this.assignedGlobalBaseActions = this.globalPrivilege.base[0]
      ? privilegeDefinition.getGlobalPrivileges().getActions(this.globalPrivilege.base[0])
      : [];
  }

  /**
   * Returns the assigned base privilege, without considering any effective privileges.
   * @param spacesIndex
   */
  public getAssignedBasePrivilege(spacesIndex: number) {
    const form = this.role.kibana[spacesIndex];
    return form.base[0] || NO_PRIVILEGE_VALUE;
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
   * - Space feature privilege (optional, defaults to true)
   *
   * @param featureId
   * @param spacesIndex
   * @param ignoreAssignedPrivilege
   */
  public explainActualSpaceFeaturePrivilege(
    featureId: string,
    spacesIndex: number,
    ignoreAssignedPrivilege: boolean = false
  ): ExplanationResult {
    const { feature = {} as FeaturePrivilegeSet } = this.role.kibana[spacesIndex] || {};
    const assignedFeaturePrivilege = feature[featureId]
      ? feature[featureId][0] || NO_PRIVILEGE_VALUE
      : NO_PRIVILEGE_VALUE;

    const privilegeSpec = this.role.kibana[spacesIndex] || {};
    const globalFeaturePrivileges = this.globalPrivilege.feature[featureId] || [];

    const scenarios: PrivilegeScenario[] = [];

    const hasAssignedFeaturePrivilege =
      !ignoreAssignedPrivilege && assignedFeaturePrivilege !== NO_PRIVILEGE_VALUE;
    let spaceFeaturePrivilegeScenario: PrivilegeScenario | null = null;

    if (hasAssignedFeaturePrivilege) {
      spaceFeaturePrivilegeScenario = {
        name: i18n.translate(
          'xpack.security.management.editRole.effectivePrivileges.spaceFeaturePrivilegeScenario',
          { defaultMessage: 'space feature privilege' }
        ),
        source: PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY,
        actions: this.privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, assignedFeaturePrivilege),
      };
      scenarios.push(spaceFeaturePrivilegeScenario);
    }

    scenarios.push(
      {
        name: i18n.translate(
          'xpack.security.management.editRole.effectivePrivileges.spaceBasePrivilegeScenario',
          { defaultMessage: 'space base privilege' }
        ),
        source: PRIVILEGE_SOURCE.EFFECTIVE_SPACE_BASE,
        actions: this.privilegeDefinition.getSpacesPrivileges().getActions(privilegeSpec.base[0]),
      },
      {
        name: i18n.translate('xpack.security.management.editRole.globalBasePrivilegeScenario', {
          defaultMessage: 'global base privilege',
        }),
        source: PRIVILEGE_SOURCE.EFFECTIVE_GLOBAL_BASE,
        actions: this.assignedGlobalBaseActions,
      }
    );

    if (globalFeaturePrivileges.length > 0 && !isGlobalPrivilegeDefinition(privilegeSpec)) {
      scenarios.push({
        name: i18n.translate(
          'xpack.security.management.editRole.effectivePrivileges.globalFeaturePrivilegeScenario',
          { defaultMessage: 'global feature privilege' }
        ),
        source: PRIVILEGE_SOURCE.EFFECTIVE_GLOBAL_FEATURE,
        actions: this.privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, globalFeaturePrivileges[0]),
      });
    }

    const winningScenario = this.locateHighestGrantedFeaturePrivilege(featureId, scenarios);
    if (!winningScenario) {
      return {
        privilege: NO_PRIVILEGE_VALUE,
        source: PRIVILEGE_SOURCE.NONE,
        details: i18n.translate(
          'xpack.security.management.editRole.effectivePrivileges.noFeaturePrivilegeAssigned',
          { defaultMessage: 'No feature privilege assigned' }
        ),
      };
    }

    if (
      spaceFeaturePrivilegeScenario &&
      winningScenario.scenario === spaceFeaturePrivilegeScenario
    ) {
      return {
        privilege: assignedFeaturePrivilege,
        source: winningScenario.scenario.source,
        details: i18n.translate(
          'xpack.security.management.editRole.effectivePrivileges.featurePrivilegeAssignedDirectly',
          { defaultMessage: 'Assigned directly' }
        ),
      };
    }

    return {
      privilege: winningScenario.privilege,
      supercededPrivilege: hasAssignedFeaturePrivilege ? assignedFeaturePrivilege : undefined,
      overrideSource: hasAssignedFeaturePrivilege ? winningScenario.scenario.name : undefined,
      source: winningScenario.scenario.source,
      overridesAssigned: hasAssignedFeaturePrivilege,
      details: i18n.translate(
        'xpack.security.management.editRole.effectivePrivileges.featurePrivilegeGrantedViaSource',
        {
          defaultMessage: 'Granted via {source}',
          values: { source: winningScenario.scenario.name },
        }
      ),
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
   * - Space base privilege (optional, defaults to true)
   *
   * @param spacesIndex
   * @param ignoreAssignedPrivilege
   */
  public explainActualSpaceBasePrivilege(
    spacesIndex: number,
    ignoreAssignedPrivilege: boolean = false
  ): ExplanationResult {
    const { base = [] as string[] } =
      (!ignoreAssignedPrivilege && this.role.kibana[spacesIndex]) || {};

    const globalBasePrivilege = this.globalPrivilege.base;

    if (base.length === 0) {
      const isSet = globalBasePrivilege.length > 0;

      return {
        privilege: isSet ? globalBasePrivilege[0] : NO_PRIVILEGE_VALUE,
        source: isSet ? PRIVILEGE_SOURCE.EFFECTIVE_GLOBAL_BASE : PRIVILEGE_SOURCE.NONE,
        details: isSet
          ? i18n.translate(
              'xpack.security.management.editRole.effectivePrivileges.basePrivilegeGrantedViaGlobal',
              { defaultMessage: 'Granted via global base privilege' }
            )
          : i18n.translate(
              'xpack.security.management.editRole.effectivePrivileges.spaceBasePrivilegeNotAssigned',
              { defaultMessage: 'Not assigned' }
            ),
      };
    }
    const allowsAssigned = this.validateSpaceBasePrivilege(base[0]);
    if (allowsAssigned.allowed) {
      return {
        privilege: base[0],
        source: PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY,
        details: i18n.translate(
          'xpack.security.management.editRole.effectivePrivileges.basePrivilegeAssignedDirectly',
          { defaultMessage: 'Assigned directly' }
        ),
      };
    }

    return {
      privilege: globalBasePrivilege[0],
      supercededPrivilege: base[0],
      overrideSource: i18n.translate(
        'xpack.security.management.editRole.effectivePrivileges.basePrivilegeOverridedViaGlobal',
        { defaultMessage: 'global base privilege' }
      ),
      source: PRIVILEGE_SOURCE.EFFECTIVE_GLOBAL_BASE,
      overridesAssigned: true,
      details: allowsAssigned.details,
    };
  }

  /**
   * Determines if the specified base privilege can be assigned, based on the current global base privilege.
   * @param privilege
   */
  public canAssignSpaceBasePrivilege(privilege: string): boolean {
    return this.validateSpaceBasePrivilege(privilege).allowed;
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
    const actualPrivilegeDetails = this.explainActualSpaceFeaturePrivilege(
      featureId,
      spacesIndex,
      true // ignoreAssignedPrivilege
    );

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

    const privilegeSpec = this.role.kibana[spacesIndex] || {};
    const globalFeaturePrivileges = this.globalPrivilege.feature[featureId] || [];

    const baseActions = [
      ...this.assignedGlobalBaseActions,
      ...this.privilegeDefinition.getSpacesPrivileges().getActions(privilegeSpec.base[0]),
    ];

    if (globalFeaturePrivileges.length > 0 && !isGlobalPrivilegeDefinition(privilegeSpec)) {
      baseActions.push(
        ...this.privilegeDefinition
          .getFeaturePrivileges()
          .getActions(featureId, globalFeaturePrivileges[0])
      );
    }

    return !areActionsFullyCovered(baseActions, featureActions);
  }

  private validateSpaceBasePrivilege(basePrivilege: string): PrivilegeValidationResponse {
    const globalBase = this.globalPrivilege.base[0] || NO_PRIVILEGE_VALUE;
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
    const { base: minimum = [] } = this.globalPrivilege || {};
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
    scenarios: PrivilegeScenario[]
  ): { scenario: PrivilegeScenario; privilege: string } | null {
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
