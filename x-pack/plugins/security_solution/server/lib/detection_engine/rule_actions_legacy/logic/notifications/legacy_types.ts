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
import { LEGACY_NOTIFICATIONS_ID } from '../../../../../../common/constants';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyRuleNotificationAlertTypeParams extends RuleTypeParams {
  ruleAlertId: string;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type LegacyRuleNotificationAlertType = Rule<LegacyRuleNotificationAlertTypeParams>;

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
export const legacyIsAlertType = (
  partialAlert: PartialRule<RuleTypeParams>
): partialAlert is LegacyRuleNotificationAlertType => {
  return partialAlert.alertTypeId === LEGACY_NOTIFICATIONS_ID;
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type LegacyNotificationExecutorOptions = RuleExecutorOptions<
  LegacyRuleNotificationAlertTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext
>;

/**
 * This returns true because by default a NotificationAlertTypeDefinition is an AlertType
 * since we are only increasing the strictness of params.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyIsNotificationAlertExecutor = (
  obj: LegacyNotificationAlertTypeDefinition
): obj is RuleType<
  LegacyRuleNotificationAlertTypeParams,
  LegacyRuleNotificationAlertTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext
> => {
  return true;
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type LegacyNotificationAlertTypeDefinition = Omit<
  RuleType<
    LegacyRuleNotificationAlertTypeParams,
    LegacyRuleNotificationAlertTypeParams,
    RuleTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    'default'
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
 * This is the notification type used within legacy_rules_notification_alert_type for the alert params.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @see legacy_rules_notification_alert_type
 */
export const legacyRulesNotificationParams = schema.object({
  ruleAlertId: schema.string(),
});

/**
 * This legacy rules notification type used within legacy_rules_notification_alert_type for the alert params.
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * @see legacy_rules_notification_alert_type
 */
export type LegacyRulesNotificationParams = TypeOf<typeof legacyRulesNotificationParams>;
