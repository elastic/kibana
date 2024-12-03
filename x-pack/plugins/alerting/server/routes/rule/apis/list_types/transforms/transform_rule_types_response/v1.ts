/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolean } from 'lodash/fp';
import { RegistryAlertTypeWithAuth } from '../../../../../../authorization';
import type { TypesRulesResponseBodyV1 } from '../../../../../../../common/routes/rule/apis/list_types';

export const transformRuleTypesResponse = (
  ruleTypes: RegistryAlertTypeWithAuth[]
): TypesRulesResponseBodyV1 => {
  return ruleTypes.map((ruleType: RegistryAlertTypeWithAuth) => {
    return {
      ...(ruleType.actionGroups ? { action_groups: ruleType.actionGroups } : {}),
      ...(ruleType.actionVariables ? { action_variables: ruleType.actionVariables } : {}),
      ...(ruleType.alerts ? { alerts: ruleType.alerts } : {}),
      authorized_consumers: ruleType.authorizedConsumers,
      category: ruleType.category,
      default_action_group_id: ruleType.defaultActionGroupId,
      ...(ruleType.defaultScheduleInterval
        ? { default_schedule_interval: ruleType.defaultScheduleInterval }
        : {}),
      ...(isBoolean(ruleType.doesSetRecoveryContext)
        ? { does_set_recovery_context: ruleType.doesSetRecoveryContext }
        : {}),
      enabled_in_license: ruleType.enabledInLicense,
      ...(ruleType.fieldsForAAD ? { fieldsForAAD: ruleType.fieldsForAAD } : {}),
      has_alerts_mappings: ruleType.hasAlertsMappings,
      has_fields_for_a_a_d: ruleType.hasFieldsForAAD,
      id: ruleType.id,
      is_exportable: ruleType.isExportable,
      minimum_license_required: ruleType.minimumLicenseRequired,
      name: ruleType.name,
      producer: ruleType.producer,
      recovery_action_group: ruleType.recoveryActionGroup,
      ...(ruleType.ruleTaskTimeout ? { rule_task_timeout: ruleType.ruleTaskTimeout } : {}),
    };
  });
};
