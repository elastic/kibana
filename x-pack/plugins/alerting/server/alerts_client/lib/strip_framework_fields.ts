/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { ALERT_REASON, ALERT_WORKFLOW_STATUS, TAGS, ALERT_URL } from '@kbn/rule-data-utils';
import { alertFieldMap } from '@kbn/alerts-as-data-utils';
import { RuleAlertData } from '../../types';

const allowedFrameworkFields = new Set<string>([
  ALERT_REASON,
  ALERT_WORKFLOW_STATUS,
  TAGS,
  ALERT_URL,
]);

/**
 * Remove framework fields from the alert payload reported by
 * the rule type. Fields are considered framework fields if they are
 * defined in the "alertFieldMap". Framework fields should only be
 * set by the alerting framework during rule execution.
 */
export const stripFrameworkFields = <AlertData extends RuleAlertData>(
  payload?: AlertData
): AlertData => {
  if (!payload) {
    return {} as AlertData;
  }

  const keysToStrip = Object.keys(alertFieldMap).filter(
    (key: string) => !allowedFrameworkFields.has(key)
  );
  return omit(payload, keysToStrip) as AlertData;
};
