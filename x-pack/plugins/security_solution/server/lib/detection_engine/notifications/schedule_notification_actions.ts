/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys, snakeCase } from 'lodash/fp';
import { AlertInstance } from '../../../../../alerting/server';
import { expandDottedObject } from '../rule_types/utils';
import { RuleParams } from '../schemas/rule_schemas';
import aadFieldConversion from '../routes/index/signal_aad_mapping.json';
import { isRACAlert } from '../signals/utils';
import { RACAlert } from '../rule_types/types';

export type NotificationRuleTypeParams = RuleParams & {
  id: string;
  name: string;
};

const convertToLegacyAlert = (alert: RACAlert) =>
  Object.entries(aadFieldConversion).reduce((acc, [legacyField, aadField]) => {
    const val = alert[aadField];
    if (val != null) {
      return {
        ...acc,
        [legacyField]: val,
      };
    }
    return acc;
  }, {});

const formatAlertsForNotificationActions = (alerts: unknown[]) => {
  return alerts.map((alert) =>
    isRACAlert(alert)
      ? {
          ...expandDottedObject(convertToLegacyAlert(alert)),
          ...expandDottedObject(alert as object),
        }
      : alerts
  );
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
      alerts: formatAlertsForNotificationActions(signals),
    });
