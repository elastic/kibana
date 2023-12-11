/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';
import { schema, TypeOf } from '@kbn/config-schema';
import { STACK_ALERTS_AAD_CONFIG } from '..';
import { RuleType, RuleExecutorOptions } from '../../types';
import { StackAlertType } from '../types';
import { executor } from './executor';

export const ID = '.user-defined';
export const ActionGroupId = 'user defined threshold met';

export type Params = TypeOf<typeof ParamsSchema>;
export const ParamsSchema = schema.object({
  stringifiedUserCode: schema.string(),
});

export function getRuleType(): RuleType<
  Params,
  never,
  {},
  {},
  {},
  typeof ActionGroupId,
  never,
  StackAlertType
> {
  const ruleTypeName = i18n.translate('xpack.stackAlerts.userDefined.ruleTypeTitle', {
    defaultMessage: 'User defined',
  });

  const actionGroupName = i18n.translate(
    'xpack.stackAlerts.userDefined.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'User defined condition met',
    }
  );

  return {
    id: ID,
    name: ruleTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: ParamsSchema,
    },
    actionVariables: {
      context: [],
      params: [],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async (
      options: RuleExecutorOptions<Params, {}, {}, {}, typeof ActionGroupId, StackAlertType>
    ) => {
      return await executor(options);
    },
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: STACK_ALERTS_FEATURE_ID,
    doesSetRecoveryContext: true,
    alerts: STACK_ALERTS_AAD_CONFIG,
    requiresAPIkey: true,
  };
}
