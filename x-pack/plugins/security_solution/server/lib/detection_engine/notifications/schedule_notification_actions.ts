/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Prefer  importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { mapKeys, snakeCase } from 'lodash/fp';
import { AlertInstance } from '../../../../../alerts/server';
import { RuleTypeParams } from '../types';

export type NotificationRuleTypeParams = RuleTypeParams & {
  name: string;
  id: string;
};

interface ScheduleNotificationActions {
  alertInstance: AlertInstance;
  signalsCount: number;
  resultsLink: string;
  ruleParams: NotificationRuleTypeParams;
}

export const scheduleNotificationActions = ({
  alertInstance,
  signalsCount,
  resultsLink = '',
  ruleParams,
}: ScheduleNotificationActions): AlertInstance =>
  alertInstance
    .replaceState({
      signals_count: signalsCount,
    })
    .scheduleActions('default', {
      results_link: resultsLink,
      rule: mapKeys(snakeCase, ruleParams),
    });
