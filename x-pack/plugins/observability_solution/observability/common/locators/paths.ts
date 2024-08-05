/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const OBSERVABILITY_BASE_PATH = '/app/observability';
export const ROOT_PATH = '/' as const;
export const LANDING_PATH = '/landing' as const;
export const OVERVIEW_PATH = '/overview' as const;
export const ALERTS_PATH = '/alerts' as const;
export const ALERT_DETAIL_PATH = '/alerts/:alertId' as const;
export const EXPLORATORY_VIEW_PATH = '/exploratory-view' as const; // has been moved to its own app. Keeping around for redirecting purposes.
export const RULES_PATH = '/alerts/rules' as const;
export const RULES_LOGS_PATH = '/alerts/rules/logs' as const;
export const RULE_DETAIL_PATH = '/alerts/rules/:ruleId' as const;
export const CASES_PATH = '/cases' as const;
export const ANNOTATIONS_PATH = '/annotations' as const;
export const SETTINGS_PATH = '/slos/settings' as const;

// // SLOs have been moved to its own app (slo). Keeping around for redirecting purposes.
export const OLD_SLOS_PATH = '/slos' as const;
export const OLD_SLOS_WELCOME_PATH = '/slos/welcome' as const;
export const OLD_SLOS_OUTDATED_DEFINITIONS_PATH = '/slos/outdated-definitions' as const;
export const OLD_SLO_DETAIL_PATH = '/slos/:sloId' as const;
export const OLD_SLO_EDIT_PATH = '/slos/edit/:sloId' as const;

export const SLO_DETAIL_PATH = '/:sloId' as const;

export const paths = {
  observability: {
    alerts: `${OBSERVABILITY_BASE_PATH}${ALERTS_PATH}`,
    annotations: `${OBSERVABILITY_BASE_PATH}${ANNOTATIONS_PATH}`,
    alertDetails: (alertId: string) =>
      `${OBSERVABILITY_BASE_PATH}${ALERTS_PATH}/${encodeURIComponent(alertId)}`,
    rules: `${OBSERVABILITY_BASE_PATH}${RULES_PATH}`,
    ruleDetails: (ruleId: string) =>
      `${OBSERVABILITY_BASE_PATH}${RULES_PATH}/${encodeURIComponent(ruleId)}`,
  },
};

export const relativePaths = {
  observability: {
    ruleDetails: (ruleId: string) => `${RULES_PATH}/${encodeURIComponent(ruleId)}`,
  },
};
