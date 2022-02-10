/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import {
  RulesClient,
  PartialAlert,
  RuleType,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  AlertExecutorOptions,
} from '../../../../../alerting/server';
import { Alert, AlertAction } from '../../../../../alerting/common';
import { LEGACY_NOTIFICATIONS_ID } from '../../../../common/constants';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export interface LegacyRuleNotificationAlertTypeParams extends AlertTypeParams {
  ruleAlertId: string;
}

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type LegacyRuleNotificationAlertType = Alert<LegacyRuleNotificationAlertTypeParams>;

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
  actions: AlertAction[];
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
  partialAlert: PartialAlert<AlertTypeParams>
): partialAlert is LegacyRuleNotificationAlertType => {
  return partialAlert.alertTypeId === LEGACY_NOTIFICATIONS_ID;
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export type LegacyNotificationExecutorOptions = AlertExecutorOptions<
  LegacyRuleNotificationAlertTypeParams,
  AlertTypeState,
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
  AlertTypeState,
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
    AlertTypeState,
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
  }: LegacyNotificationExecutorOptions) => Promise<AlertTypeState | void>;
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
