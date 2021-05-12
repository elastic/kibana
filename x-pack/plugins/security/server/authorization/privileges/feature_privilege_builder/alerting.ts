/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type { FeatureKibanaPrivileges, KibanaFeature } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

enum AlertingType {
  RULE = 'rule',
  ALERT = 'alert',
}

const readOperations: Record<AlertingType, string[]> = {
  rule: ['get', 'getAlertState', 'getAlertInstanceSummary', 'find'],
  alert: ['get', 'find'],
};

const writeOperations: Record<AlertingType, string[]> = {
  rule: [
    'create',
    'delete',
    'update',
    'updateApiKey',
    'enable',
    'disable',
    'muteAll',
    'unmuteAll',
    'muteInstance',
    'unmuteInstance',
  ],
  alert: ['update'],
};
const allOperations: Record<AlertingType, string[]> = {
  rule: [...readOperations.rule, ...writeOperations.rule],
  alert: [...readOperations.alert, ...writeOperations.alert],
};

export class FeaturePrivilegeAlertingBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: KibanaFeature
  ): string[] {
    const getAlertingPrivilege = (
      operations: string[],
      privilegedTypes: readonly string[],
      alertingEntity: string,
      consumer: string
    ) =>
      privilegedTypes.flatMap((type) =>
        operations.map((operation) =>
          this.actions.alerting.get(type, consumer, alertingEntity, operation)
        )
      );

    let ruleAll: string[] = [];
    let ruleRead: string[] = [];
    let alertAll: string[] = [];
    let alertRead: string[] = [];
    if (Array.isArray(privilegeDefinition.alerting?.all)) {
      ruleAll = [...(privilegeDefinition.alerting?.all ?? [])];
      alertAll = [...(privilegeDefinition.alerting?.all ?? [])];
    } else {
      const allObject = privilegeDefinition.alerting?.all as {
        rule?: readonly string[];
        alert?: readonly string[];
      };
      const rule = allObject?.rule ?? [];
      const alert = allObject?.alert ?? [];
      ruleAll = [...rule];
      alertAll = [...alert];
    }

    if (Array.isArray(privilegeDefinition.alerting?.read)) {
      ruleRead = [...(privilegeDefinition.alerting?.read ?? [])];
      alertRead = [...(privilegeDefinition.alerting?.read ?? [])];
    } else {
      const readObject = privilegeDefinition.alerting?.read as {
        rule?: readonly string[];
        alert?: readonly string[];
      };
      const rule = readObject?.rule ?? [];
      const alert = readObject?.alert ?? [];
      ruleRead = [...rule];
      alertRead = [...alert];
    }

    if (feature.id === 'stackAlerts') {
      console.log(`ruleAll ${ruleAll}`);
      console.log(`ruleRead ${ruleRead}`);
      console.log(`alertAll ${alertAll}`);
      console.log(`alertRead ${alertRead}`);
    }

    return uniq([
      ...getAlertingPrivilege(allOperations.rule, ruleAll, 'rule', feature.id),
      ...getAlertingPrivilege(allOperations.alert, alertAll, 'alert', feature.id),
      ...getAlertingPrivilege(readOperations.rule, ruleRead, 'rule', feature.id),
      ...getAlertingPrivilege(readOperations.alert, alertRead, 'alert', feature.id),
    ]);
  }
}
