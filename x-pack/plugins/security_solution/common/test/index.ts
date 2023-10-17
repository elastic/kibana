/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type roleDefinitions from '@kbn/es/src/serverless_resources/roles.json';

export type SecurityRoleName = keyof typeof roleDefinitions;

export enum SERVERLESS_ROLES {
  t1_analyst = 't1_analyst',
  t2_analyst = 't2_analyst',
  t3_analyst = 't3_analyst',
  rule_author = 'rule_author',
  soc_manager = 'soc_manager',
  detections_admin = 'detections_admin',
  platform_engineer = 'platform_engineer',
}

// For the source of these roles please consult the PR these were introduced https://github.com/elastic/kibana/pull/81866#issue-511165754
export enum ROLES {
  soc_manager = 'soc_manager',
  reader = 'reader',
  t1_analyst = 't1_analyst',
  t2_analyst = 't2_analyst',
  t3_analyst = 't3_analyst',
  hunter = 'hunter',
  hunter_no_actions = 'hunter_no_actions',
  rule_author = 'rule_author',
  platform_engineer = 'platform_engineer',
  detections_admin = 'detections_admin',
}

/**
 * Provides a map of the commonly used date ranges found under the Quick Menu popover of the
 * super date picker component.
 */
export const DATE_RANGE_OPTION_TO_TEST_SUBJ_MAP = Object.freeze({
  Today: 'superDatePickerCommonlyUsed_Today',
  'This week': 'superDatePickerCommonlyUsed_This_week',
  'Last 15 minutes': 'superDatePickerCommonlyUsed_Last_15 minutes',
  'Last 30 minutes': 'superDatePickerCommonlyUsed_Last_30 minutes',
  'Last 1 hour': 'superDatePickerCommonlyUsed_Last_1 hour',
  'Last 24 hours': 'superDatePickerCommonlyUsed_Last_24 hours',
  'Last 7 days': 'superDatePickerCommonlyUsed_Last_7 days',
  'Last 30 days': 'superDatePickerCommonlyUsed_Last_30 days',
  'Last 90 days': 'superDatePickerCommonlyUsed_Last_90 days',
  'Last 1 year': 'superDatePickerCommonlyUsed_Last_1 year',
});
