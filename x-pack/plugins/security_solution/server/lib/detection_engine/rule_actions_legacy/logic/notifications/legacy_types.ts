/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type {
  RulesClient,
  PartialRule,
  RuleType,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  RuleExecutorOptions,
} from '@kbn/alerting-plugin/server';
import type { Rule, RuleAction } from '@kbn/alerting-plugin/common';
import type { DefaultAlert } from '@kbn/alerts-as-data-utils';
import { LEGACY_NOTIFICATIONS_ID } from '../../../../../../common/constants';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyRuleNotificationRuleTypeParams extends RuleTypeParams {
  ruleAlertId: string;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type LegacyRuleNotificationRuleType = Rule<LegacyRuleNotificationRuleTypeParams>;

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyFindNotificationParams {
  rulesClient: RulesClient;
  perPage?: number;
  page?: number;
  sortField?: string;
  filter?: string;
  fields?: string[];
  sortOrder?: 'asc' | 'desc';
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyClients {
  rulesClient: RulesClient;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyNotificationAlertParams {
  actions: RuleAction[];
  enabled: boolean;
  ruleAlertId: string;
  interval: string;
  name: string;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type CreateNotificationParams = LegacyNotificationAlertParams & LegacyClients;

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyReadNotificationParams {
  rulesClient: RulesClient;
  id?: string | null;
  ruleAlertId?: string | null;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const isLegacyRuleType = (
  partialRule: PartialRule<RuleTypeParams>
): partialRule is LegacyRuleNotificationRuleType => {
  return partialRule.alertTypeId === LEGACY_NOTIFICATIONS_ID;
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type LegacyNotificationExecutorOptions = RuleExecutorOptions<
  LegacyRuleNotificationRuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  'default',
  DefaultAlert
>;

/**
 * This returns true because by default a NotificationRuleTypeDefinition is an RuleType
 * since we are only increasing the strictness of params.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const isLegacyNotificationRuleExecutor = (
  obj: LegacyNotificationRuleTypeDefinition
): obj is RuleType<
  LegacyRuleNotificationRuleTypeParams,
  LegacyRuleNotificationRuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  'default',
  never,
  DefaultAlert
> => {
  return true;
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type LegacyNotificationRuleTypeDefinition = Omit<
  RuleType<
    LegacyRuleNotificationRuleTypeParams,
    LegacyRuleNotificationRuleTypeParams,
    RuleTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    'default',
    never,
    DefaultAlert
  >,
  'executor'
> & {
  executor: ({
    services,
    params,
    state,
  }: LegacyNotificationExecutorOptions) => Promise<RuleTypeState | void>;
};

/**
 * This is the notification type used within legacy_rules_notification_rule_type for the alert params.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @see legacy_rules_notification_rule_type
 */
export const legacyRulesNotificationParams = schema.object({
  ruleAlertId: schema.string(),
});

/**
 * This legacy rules notification type used within legacy_rules_notification_rule_type for the alert params.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @see legacy_rules_notification_rule_type
 */
export type LegacyRulesNotificationParams = TypeOf<typeof legacyRulesNotificationParams>;
