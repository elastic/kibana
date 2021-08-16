/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys, snakeCase } from 'lodash/fp';
import { AlertInstance } from '../../../../../alerting/server';
import { RuleParams } from '../schemas/rule_schemas';

export type NotificationRuleTypeParams = RuleParams & {
  id: string;
  name: string;
};

interface ScheduleNotificationActions {
  alertInstance: AlertInstance;
  signalsCount: number;
  resultsLink: string;
  ruleParams: NotificationRuleTypeParams;
  signals: unknown[];
}

export const scheduleNotificationActions = ({
  alertInstance,
  signalsCount,
  resultsLink = '',
  ruleParams,
  signals,
}: ScheduleNotificationActions): AlertInstance =>
  alertInstance
    .replaceState({
      signals_count: signalsCount,
    })
    .scheduleActions('default', {
      results_link: resultsLink,
      rule: mapKeys(snakeCase, ruleParams),
      alerts: signals,
    });
