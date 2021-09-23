/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RulesClient,
  PartialAlert,
  AlertType,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  AlertExecutorOptions,
} from '../../../../../alerting/server';
import { Alert, AlertAction } from '../../../../../alerting/common';
import { LEGACY_NOTIFICATIONS_ID } from '../../../../common/constants';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export interface LegacyRuleNotificationAlertTypeParams extends AlertTypeParams {
  ruleAlertId: string;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export type LegacyRuleNotificationAlertType = Alert<LegacyRuleNotificationAlertTypeParams>;

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
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
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export interface LegacyClients {
  rulesClient: RulesClient;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export interface LegacyNotificationAlertParams {
  actions: AlertAction[];
  enabled: boolean;
  ruleAlertId: string;
  interval: string;
  name: string;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export type CreateNotificationParams = LegacyNotificationAlertParams & LegacyClients;

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export interface LegacyReadNotificationParams {
  rulesClient: RulesClient;
  id?: string | null;
  ruleAlertId?: string | null;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const legacyIsAlertType = (
  partialAlert: PartialAlert<AlertTypeParams>
): partialAlert is LegacyRuleNotificationAlertType => {
  return partialAlert.alertTypeId === LEGACY_NOTIFICATIONS_ID;
};

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
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
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const legacyIsNotificationAlertExecutor = (
  obj: LegacyNotificationAlertTypeDefinition
): obj is AlertType<
  AlertTypeParams,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext
> => {
  return true;
};

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export type LegacyNotificationAlertTypeDefinition = Omit<
  AlertType<
    AlertTypeParams,
    AlertTypeParams,
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
