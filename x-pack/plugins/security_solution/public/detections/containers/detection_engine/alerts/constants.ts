/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID } from '../../../../../common/constants';

export const ALERTS_QUERY_NAMES = {
  ADD_EXCEPTION_FLYOUT: `${APP_UI_ID} fetchAlerts addExceptionFlyout`,
  ALERTS_COUNT_BY_STATUS: `${APP_UI_ID} fetchAlerts byRulebyCount`,
  ALERTS_GROUPING: `${APP_UI_ID} fetchAlerts grouping`,
  BY_ID: `${APP_UI_ID} fetchAlerts byId`,
  BY_RULE_BY_STATUS: `${APP_UI_ID} fetchAlerts byRulebyStatus`,
  BY_RULE_ID: `${APP_UI_ID} fetchAlerts byRuleId`,
  BY_SEVERITY: `${APP_UI_ID} fetchAlerts bySeverity`,
  BY_STATUS: `${APP_UI_ID} fetchAlerts byStatus`,
  CASES: `${APP_UI_ID} fetchAlerts cases`,
  COUNT: `${APP_UI_ID} fetchAlerts count`,
  HISTOGRAM: `${APP_UI_ID} fetchAlerts histogram`,
  PREVALENCE: `${APP_UI_ID} fetchAlerts prevalence`,
  SOC_TRENDS: `${APP_UI_ID} fetchAlerts socTrends`,
  TREE_MAP: `${APP_UI_ID} fetchAlerts treeMap`,
  VULNERABLE_HOSTS: `${APP_UI_ID} fetchAlerts vulnerableHosts`,
  VULNERABLE_USERS: `${APP_UI_ID} fetchAlerts vulnerableUsers`,
} as const;
