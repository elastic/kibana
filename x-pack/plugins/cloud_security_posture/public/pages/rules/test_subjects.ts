/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CSP_RULES_CONTAINER = 'csp_rules_container';

export const CSP_RULES_TABLE = 'csp_rules_table';
export const CSP_RULES_TABLE_ROW_ITEM_NAME = 'csp_rules_table_row_item_name';
export const CSP_RULES_FLYOUT_CONTAINER = 'csp_rules_flyout_container';

export const RULE_COUNTERS_TEST_SUBJ = {
  RULE_COUNTERS_EMPTY_STATE: 'rules-counters-empty-state',
  POSTURE_SCORE_COUNTER: 'rules-counters-posture-score-counter',
  POSTURE_SCORE_BUTTON: 'rules-counters-posture-score-button',
  INTEGRATIONS_EVALUATED_COUNTER: 'rules-counters-integrations-evaluated-counter',
  INTEGRATIONS_EVALUATED_BUTTON: 'rules-counters-integrations-evaluated-button',
  FAILED_FINDINGS_COUNTER: 'rules-counters-failed-findings-counter',
  FAILED_FINDINGS_BUTTON: 'rules-counters-failed-findings-button',
  DISABLED_RULES_COUNTER: 'rules-counters-disabled-rules-counter',
  DISABLED_RULES_BUTTON: 'rules-counters-disabled-rules-button',
};

export const getCspBenchmarkRuleTableRowItemTestId = (id: string) =>
  `${CSP_RULES_TABLE_ROW_ITEM_NAME}_${id}`;
