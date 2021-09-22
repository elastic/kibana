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
import { __DO_NOT_USE__NOTIFICATIONS_ID } from '../../../../common/constants';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface __DO_NOT_USE__RuleNotificationAlertTypeParams extends AlertTypeParams {
  ruleAlertId: string;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type __DO_NOT_USE__RuleNotificationAlertType =
  Alert<__DO_NOT_USE__RuleNotificationAlertTypeParams>;

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface __DO_NOT_USE__FindNotificationParams {
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
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface __DO_NOT_USE__Clients {
  rulesClient: RulesClient;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface __DO_NOT_USE__NotificationAlertParams {
  actions: AlertAction[];
  enabled: boolean;
  ruleAlertId: string;
  interval: string;
  name: string;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export type CreateNotificationParams = __DO_NOT_USE__NotificationAlertParams &
  __DO_NOT_USE__Clients;

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface __DO_NOT_USE__ReadNotificationParams {
  rulesClient: RulesClient;
  id?: string | null;
  ruleAlertId?: string | null;
}

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__isAlertType = (
  partialAlert: PartialAlert<AlertTypeParams>
): partialAlert is __DO_NOT_USE__RuleNotificationAlertType => {
  return partialAlert.alertTypeId === __DO_NOT_USE__NOTIFICATIONS_ID;
};

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type __DO_NOT_USE__NotificationExecutorOptions = AlertExecutorOptions<
  __DO_NOT_USE__RuleNotificationAlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext
>;

/**
 * This returns true because by default a NotificationAlertTypeDefinition is an AlertType
 * since we are only increasing the strictness of params.
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const __DO_NOT_USE__isNotificationAlertExecutor = (
  obj: __DO_NOT_USE__NotificationAlertTypeDefinition
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
// eslint-disable-next-line @typescript-eslint/naming-convention
export type __DO_NOT_USE__NotificationAlertTypeDefinition = Omit<
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
  }: __DO_NOT_USE__NotificationExecutorOptions) => Promise<AlertTypeState | void>;
};
