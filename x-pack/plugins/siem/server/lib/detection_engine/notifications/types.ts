/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AlertsClient,
  PartialAlert,
  AlertType,
  State,
  AlertExecutorOptions,
} from '../../../../../alerts/server';
import { Alert } from '../../../../../alerts/common';
import { NOTIFICATIONS_ID } from '../../../../common/constants';
import { RuleAlertAction } from '../../../../common/detection_engine/types';

export interface RuleNotificationAlertType extends Alert {
  params: {
    ruleAlertId: string;
  };
}

export interface FindNotificationParams {
  alertsClient: AlertsClient;
  perPage?: number;
  page?: number;
  sortField?: string;
  filter?: string;
  fields?: string[];
  sortOrder?: 'asc' | 'desc';
}

export interface FindNotificationsRequestParams {
  per_page: number;
  page: number;
  search?: string;
  sort_field?: string;
  filter?: string;
  fields?: string[];
  sort_order?: 'asc' | 'desc';
}

export interface Clients {
  alertsClient: AlertsClient;
}

export type UpdateNotificationParams = Omit<
  NotificationAlertParams,
  'interval' | 'actions' | 'tags'
> & {
  actions: RuleAlertAction[];
  interval: string | null | undefined;
  ruleAlertId: string;
} & Clients;

export type DeleteNotificationParams = Clients & {
  id?: string;
  ruleAlertId?: string;
};

export interface NotificationAlertParams {
  actions: RuleAlertAction[];
  enabled: boolean;
  ruleAlertId: string;
  interval: string;
  name: string;
}

export type CreateNotificationParams = NotificationAlertParams & Clients;

export interface ReadNotificationParams {
  alertsClient: AlertsClient;
  id?: string | null;
  ruleAlertId?: string | null;
}

export const isAlertTypes = (
  partialAlert: PartialAlert[]
): partialAlert is RuleNotificationAlertType[] => {
  return partialAlert.every((rule) => isAlertType(rule));
};

export const isAlertType = (
  partialAlert: PartialAlert
): partialAlert is RuleNotificationAlertType => {
  return partialAlert.alertTypeId === NOTIFICATIONS_ID;
};

export type NotificationExecutorOptions = Omit<AlertExecutorOptions, 'params'> & {
  params: {
    ruleAlertId: string;
  };
};

// This returns true because by default a NotificationAlertTypeDefinition is an AlertType
// since we are only increasing the strictness of params.
export const isNotificationAlertExecutor = (
  obj: NotificationAlertTypeDefinition
): obj is AlertType => {
  return true;
};

export type NotificationAlertTypeDefinition = Omit<AlertType, 'executor'> & {
  executor: ({ services, params, state }: NotificationExecutorOptions) => Promise<State | void>;
};
