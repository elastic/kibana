/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { ALERT_FLAPPING, ALERT_FLAPPING_HISTORY, TIMESTAMP } from '@kbn/rule-data-utils';
import { RawAlertInstance } from '@kbn/alerting-state-types';
import { RuleAlertData } from '../../types';
import { AlertRule } from '../types';
import { removeUnflattenedFieldsFromAlert } from './format_alert';

interface BuildUpdatedRecoveredAlertOpts<AlertData extends RuleAlertData> {
  alert: Alert & AlertData;
  legacyRawAlert: RawAlertInstance;
  timestamp: string;
  rule: AlertRule;
}

/**
 * Updates an existing recovered alert document with latest flapping
 * information
 */

export const buildUpdatedRecoveredAlert = <AlertData extends RuleAlertData>({
  alert,
  legacyRawAlert,
  rule,
  timestamp,
}: BuildUpdatedRecoveredAlertOpts<AlertData>): Alert & AlertData => {
  const alertUpdates = {
    // Set latest rule configuration
    ...rule,
    // Update the timestamp to reflect latest update time
    [TIMESTAMP]: timestamp,
    // Set latest flapping state
    [ALERT_FLAPPING]: legacyRawAlert.meta?.flapping,
    // Set latest flapping history
    [ALERT_FLAPPING_HISTORY]: legacyRawAlert.meta?.flappingHistory,
  };
  const formattedAlert = removeUnflattenedFieldsFromAlert(alert, alertUpdates);
  return deepmerge.all([formattedAlert, alertUpdates], {
    arrayMerge: (_, sourceArray) => sourceArray,
  }) as Alert & AlertData;
};
