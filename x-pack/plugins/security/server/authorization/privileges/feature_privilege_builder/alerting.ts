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
  rule: ['get', 'getRuleState', 'getAlertSummary', 'find'],
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
    'muteAlert',
    'unmuteAlert',
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
      operations: Record<AlertingType, string[]>,
      privilegedTypes: readonly string[],
      consumer: string
    ) =>
      privilegedTypes.flatMap((privilegedType) =>
        Object.values(AlertingType).flatMap((alertingType) =>
          operations[alertingType].map((operation) =>
            this.actions.alerting.get(privilegedType, consumer, alertingType, operation)
          )
        )
      );

    return uniq([
      ...getAlertingPrivilege(allOperations, privilegeDefinition.alerting?.all ?? [], feature.id),
      ...getAlertingPrivilege(readOperations, privilegeDefinition.alerting?.read ?? [], feature.id),
    ]);
  }
}
