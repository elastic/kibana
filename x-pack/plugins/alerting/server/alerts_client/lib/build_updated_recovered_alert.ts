/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { RawAlertInstance } from '@kbn/alerting-state-types';
import { RuleAlertData } from '../../types';
import { AlertRule } from '../types';

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
  return deepmerge.all(
    [
      alert,
      {
        // Update the timestamp to reflect latest update time
        '@timestamp': timestamp,
        kibana: {
          alert: {
            // Set latest flapping state
            flapping: legacyRawAlert.meta?.flapping,
            // Set latest flapping history
            flapping_history: legacyRawAlert.meta?.flappingHistory,
            // Set latest rule configuration
            rule: rule.kibana?.alert.rule,
          },
        },
      },
    ],
    { arrayMerge: (_, sourceArray) => sourceArray }
  ) as Alert & AlertData;
};
