/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, PartialAlert, AlertTypeParams } from '../../../../../alerting/server';
import { Alert } from '../../../../../alerting/common';
import { NOTIFICATIONS_ID } from '../../../../common/constants';

export interface RuleNotificationAlertTypeParams extends AlertTypeParams {
  ruleAlertId: string;
}
export type RuleNotificationAlertType = Alert<RuleNotificationAlertTypeParams>;

export interface Clients {
  rulesClient: RulesClient;
}

export const isAlertTypes = (
  partialAlert: Array<PartialAlert<AlertTypeParams>>
): partialAlert is RuleNotificationAlertType[] => {
  return partialAlert.every((rule) => isAlertType(rule));
};

export const isAlertType = (
  partialAlert: PartialAlert<AlertTypeParams>
): partialAlert is RuleNotificationAlertType => {
  return partialAlert.alertTypeId === NOTIFICATIONS_ID;
};
