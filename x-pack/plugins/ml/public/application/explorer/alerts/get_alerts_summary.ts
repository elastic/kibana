/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_RULE_NAME,
  ALERT_STATUS,
  ALERT_END,
  ALERT_START,
  ALERT_STATUS_ACTIVE,
} from '@kbn/rule-data-utils';
import { groupBy } from 'lodash';
import type { AnomalyDetectionAlert } from './anomaly_detection_alerts_state_service';

export type RulesSummary = Array<[string, RuleSummary]>;

export interface RuleSummary {
  activeCount: number;
  totalCount: number;
  lastDuration: number;
  startedAt: number;
  recoveredAt: number | undefined;
}

export function getAlertsSummary(alertsData: AnomalyDetectionAlert[]): RulesSummary {
  return Object.entries(groupBy(alertsData, ALERT_RULE_NAME) ?? [])
    .map<[string, RuleSummary]>(([ruleName, alerts]) => {
      // Find the latest alert for each rule
      const latestAlert: AnomalyDetectionAlert = alerts.reduce((latest, alert) => {
        return alert[ALERT_START] > latest[ALERT_START] ? alert : latest;
      });

      return [
        ruleName,
        {
          totalCount: alerts.length,
          activeCount: alerts.filter((alert) => alert[ALERT_STATUS] === ALERT_STATUS_ACTIVE).length,
          recoveredAt: latestAlert[ALERT_END],
          startedAt: latestAlert[ALERT_START],
          lastDuration: latestAlert[ALERT_DURATION],
        },
      ];
    })
    .sort(([, alertsA], [, alertsB]) => {
      // 1. Prioritize rules with the highest number of active alerts
      if (alertsA.activeCount > alertsB.activeCount) return -1;
      if (alertsA.activeCount < alertsB.activeCount) return 1;
      // 2. Prioritize rules with the highest number of alerts in general
      if (alertsA.totalCount > alertsB.totalCount) return -1;
      if (alertsA.totalCount < alertsB.totalCount) return 1;
      // 3. At last prioritize rules with the longest duration
      if (alertsA.lastDuration > alertsB.lastDuration) return -1;
      if (alertsA.lastDuration < alertsB.lastDuration) return 1;
      return 0;
    });
}
