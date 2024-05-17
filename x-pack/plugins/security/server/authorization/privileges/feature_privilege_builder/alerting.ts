/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, uniq } from 'lodash';

import type { FeatureKibanaPrivileges, KibanaFeature } from '@kbn/features-plugin/server';

import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

enum AlertingEntity {
  RULE = 'rule',
  ALERT = 'alert',
}

const readOperations: Record<AlertingEntity, string[]> = {
  rule: [
    'get',
    'getRuleState',
    'getAlertSummary',
    'getExecutionLog',
    'getActionErrorLog',
    'find',
    'getRuleExecutionKPI',
    'getBackfill',
    'findBackfill',
  ],
  alert: ['get', 'find', 'getAuthorizedAlertsIndices', 'getAlertSummary'],
};

const writeOperations: Record<AlertingEntity, string[]> = {
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
    'snooze',
    'bulkEdit',
    'bulkDelete',
    'bulkEnable',
    'bulkDisable',
    'unsnooze',
    'runSoon',
    'scheduleBackfill',
    'deleteBackfill',
  ],
  alert: ['update'],
};
const allOperations: Record<AlertingEntity, string[]> = {
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
      ruleTypeIds: readonly string[],
      alertingEntity: string,
      consumers: string[]
    ) =>
      ruleTypeIds.flatMap((ruleTypeId) =>
        consumers.flatMap((consumer) =>
          operations.map((operation) =>
            this.actions.alerting.get(ruleTypeId, consumer, alertingEntity, operation)
          )
        )
      );

    const getPrivilegesForEntity = (entity: AlertingEntity) => {
      const allRuleTypeIds = get(privilegeDefinition.alerting, `${entity}.all.ruleTypeIds`) ?? [];
      const allConsumers = get(privilegeDefinition.alerting, `${entity}.all.consumers`) ?? [];
      const readRuleTypeId = get(privilegeDefinition.alerting, `${entity}.read.ruleTypeIds`) ?? [];
      const readConsumers = get(privilegeDefinition.alerting, `${entity}.read.consumers`) ?? [];

      return uniq([
        ...getAlertingPrivilege(allOperations[entity], allRuleTypeIds, entity, allConsumers),
        ...getAlertingPrivilege(readOperations[entity], readRuleTypeId, entity, readConsumers),
      ]);
    };

    return uniq([
      ...getPrivilegesForEntity(AlertingEntity.RULE),
      ...getPrivilegesForEntity(AlertingEntity.ALERT),
    ]);
  }
}
