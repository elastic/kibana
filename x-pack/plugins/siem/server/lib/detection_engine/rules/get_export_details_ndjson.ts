/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OutputRuleAlertRest } from '../types';

export const getExportDetailsNdjson = (
  rules: Array<Partial<OutputRuleAlertRest>>,
  missingRules: Array<{ rule_id: string }> = []
): string => {
  const stringified = JSON.stringify({
    exported_count: rules.length,
    missing_rules: missingRules,
    missing_rules_count: missingRules.length,
  });
  return `${stringified}\n`;
};
