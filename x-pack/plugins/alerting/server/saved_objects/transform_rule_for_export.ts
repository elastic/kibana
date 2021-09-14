/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { getAlertExecutionStatusPending } from '../lib/alert_execution_status';
import { RawAlert } from '../types';

export function transformRulesForExport(rules: SavedObject[]): Array<SavedObject<RawAlert>> {
  const exportDate = new Date().toISOString();
  return rules.map((rule) => transformRuleForExport(rule as SavedObject<RawAlert>, exportDate));
}

function transformRuleForExport(
  rule: SavedObject<RawAlert>,
  exportDate: string
): SavedObject<RawAlert> {
  return {
    ...rule,
    attributes: {
      ...rule.attributes,
      legacyId: null,
      enabled: false,
      apiKey: null,
      apiKeyOwner: null,
      scheduledTaskId: null,
      executionStatus: getAlertExecutionStatusPending(exportDate),
    },
  };
}
