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
} from '../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../views/management/edit_role/lib/constants';
import { isGlobalPrivilegeDefinition } from '../privilege_utils';
import {
  PRIVILEGE_SOURCE,
  PrivilegeExplanation,
  PrivilegeScenario,
} from './kibana_privilege_calculator_types';
import { areActionsFullyCovered } from './privilege_calculator_utils';

export class KibanaFeaturePrivilegeCalculator {
  // list of privilege actions that comprise the global base privilege
  private assignedGlobalBaseActions: string[];

  constructor(
    private readonly privilegeDefinition: PrivilegeDefinition,
    private readonly globalPrivilege: KibanaPrivilegeSpec,
    public readonly rankedFeaturePrivileges: FeaturePrivilegeSet
  ) {
    this.assignedGlobalBaseActions = this.globalPrivilege.base[0]
      ? privilegeDefinition.getGlobalPrivileges().getActions(this.globalPrivilege.base[0])
      : [];
  }

  public getMostPermissiveFeaturePrivilege(
    privilegeSpec: KibanaPrivilegeSpec,
    basePrivilegeExplanation: PrivilegeExplanation,
    featureId: string,
    ignoreAssigned: boolean
  ): PrivilegeExplanation {
    const scenarios = this.buildFeaturePrivilegeScenarios(
      privilegeSpec,
      basePrivilegeExplanation,
      featureId,
      ignoreAssigned
    );

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
            actualPrivilege: featurePrivilege,
            actualPrivilegeSource: scenario.actualPrivilegeSource,
            isDirectlyAssigned: scenario.isDirectlyAssigned,
            ...this.buildSupercededFields(
              !scenario.isDirectlyAssigned,
              scenario.supercededPrivilege,
              scenario.supercededPrivilegeSource
            ),
          };
        }
      }
    }

    const isGlobal = isGlobalPrivilegeDefinition(privilegeSpec);
    return {
      actualPrivilege: NO_PRIVILEGE_VALUE,
      actualPrivilegeSource: isGlobal
        ? PRIVILEGE_SOURCE.GLOBAL_FEATURE
        : PRIVILEGE_SOURCE.SPACE_FEATURE,
      isDirectlyAssigned: true,
    };
  }

  private buildFeaturePrivilegeScenarios(
    privilegeSpec: KibanaPrivilegeSpec,
    basePrivilegeExplanation: PrivilegeExplanation,
    featureId: string,
    ignoreAssigned: boolean
  ): PrivilegeScenario[] {
    const scenarios: PrivilegeScenario[] = [];

    const isGlobalPrivilege = isGlobalPrivilegeDefinition(privilegeSpec);

    const assignedGlobalFeaturePrivilege = this.getAssignedFeaturePrivilege(
      this.globalPrivilege,
      featureId
    );

    const assignedFeaturePrivilege = this.getAssignedFeaturePrivilege(privilegeSpec, featureId);
    const hasAssignedFeaturePrivilege = assignedFeaturePrivilege !== NO_PRIVILEGE_VALUE;

    scenarios.push({
      actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
      isDirectlyAssigned: false,
      actions: [...this.assignedGlobalBaseActions],
      ...this.buildSupercededFields(
        hasAssignedFeaturePrivilege,
        assignedFeaturePrivilege,
        isGlobalPrivilege ? PRIVILEGE_SOURCE.GLOBAL_FEATURE : PRIVILEGE_SOURCE.SPACE_FEATURE
      ),
    });

    if (!isGlobalPrivilege || !ignoreAssigned) {
      scenarios.push({
        actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_FEATURE,
        actions: this.getFeatureActions(featureId, assignedGlobalFeaturePrivilege),
        isDirectlyAssigned: isGlobalPrivilege && hasAssignedFeaturePrivilege,
        ...this.buildSupercededFields(
          hasAssignedFeaturePrivilege && !isGlobalPrivilege,
          assignedFeaturePrivilege,
          PRIVILEGE_SOURCE.SPACE_FEATURE
        ),
      });
    }

    if (isGlobalPrivilege) {
      return this.rankScenarios(scenarios);
    }

    // Otherwise, this is a space feature privilege

    // If the base privilege is directly assigned, then use it.
    // If it's not directly assigned, then it is already covered by the GLOBAL_BASE scenario above.
    if (basePrivilegeExplanation.isDirectlyAssigned) {
      scenarios.push({
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
        isDirectlyAssigned: false,
        actions: this.getBaseActions(
          basePrivilegeExplanation.actualPrivilegeSource,
          basePrivilegeExplanation.actualPrivilege
        ),
        ...this.buildSupercededFields(
          hasAssignedFeaturePrivilege,
          assignedFeaturePrivilege,
          PRIVILEGE_SOURCE.SPACE_FEATURE
        ),
      });
    }

    if (!ignoreAssigned) {
      scenarios.push({
        actualPrivilegeSource: PRIVILEGE_SOURCE.SPACE_FEATURE,
        isDirectlyAssigned: true,
        actions: this.getFeatureActions(
          featureId,
          this.getAssignedFeaturePrivilege(privilegeSpec, featureId)
        ),
      });
    }

    return this.rankScenarios(scenarios);
  }

  private rankScenarios(scenarios: PrivilegeScenario[]): PrivilegeScenario[] {
    return scenarios.sort(
      (scenario1, scenario2) => scenario1.actualPrivilegeSource - scenario2.actualPrivilegeSource
    );
  }

  private getBaseActions(source: PRIVILEGE_SOURCE, privilegeId: string) {
    switch (source) {
      case PRIVILEGE_SOURCE.GLOBAL_BASE:
        return this.assignedGlobalBaseActions;
      case PRIVILEGE_SOURCE.SPACE_BASE:
        return this.privilegeDefinition.getSpacesPrivileges().getActions(privilegeId);
      default:
        throw new Error(
          `Cannot get base actions for unsupported privilege source ${PRIVILEGE_SOURCE[source]}`
        );
    }
  }

  private getFeatureActions(featureId: string, privilegeId: string) {
    return this.privilegeDefinition.getFeaturePrivileges().getActions(featureId, privilegeId);
  }

  private getAssignedFeaturePrivilege(privilegeSpec: KibanaPrivilegeSpec, featureId: string) {
    const featureEntry = privilegeSpec.feature[featureId] || [];
    return featureEntry[0] || NO_PRIVILEGE_VALUE;
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
