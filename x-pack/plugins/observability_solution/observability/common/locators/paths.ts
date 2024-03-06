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
export const SLOS_PATH = '/slos' as const;
export const SLOS_WELCOME_PATH = '/slos/welcome' as const;
export const SLO_DETAIL_PATH = '/slos/:sloId' as const;
export const SLO_CREATE_PATH = '/slos/create' as const;
export const SLO_EDIT_PATH = '/slos/edit/:sloId' as const;
export const SLOS_OUTDATED_DEFINITIONS_PATH = '/slos/outdated-definitions' as const;
export const CASES_PATH = '/cases' as const;

export const paths = {
  observability: {
    alerts: `${OBSERVABILITY_BASE_PATH}${ALERTS_PATH}`,
    alertDetails: (alertId: string) =>
      `${OBSERVABILITY_BASE_PATH}${ALERTS_PATH}/${encodeURI(alertId)}`,
    rules: `${OBSERVABILITY_BASE_PATH}${RULES_PATH}`,
    ruleDetails: (ruleId: string) => `${OBSERVABILITY_BASE_PATH}${RULES_PATH}/${encodeURI(ruleId)}`,
    slos: `${OBSERVABILITY_BASE_PATH}${SLOS_PATH}`,
    slosWelcome: `${OBSERVABILITY_BASE_PATH}${SLOS_WELCOME_PATH}`,
    slosOutdatedDefinitions: `${OBSERVABILITY_BASE_PATH}${SLOS_OUTDATED_DEFINITIONS_PATH}`,
    sloCreate: `${OBSERVABILITY_BASE_PATH}${SLO_CREATE_PATH}`,
    sloCreateWithEncodedForm: (encodedParams: string) =>
      `${OBSERVABILITY_BASE_PATH}${SLO_CREATE_PATH}?_a=${encodedParams}`,
    sloEdit: (sloId: string) => `${OBSERVABILITY_BASE_PATH}${SLOS_PATH}/edit/${encodeURI(sloId)}`,
    sloEditWithEncodedForm: (sloId: string, encodedParams: string) =>
      `${OBSERVABILITY_BASE_PATH}${SLOS_PATH}/edit/${encodeURI(sloId)}?_a=${encodedParams}`,
    sloDetails: (sloId: string, instanceId?: string) =>
      !!instanceId
        ? `${OBSERVABILITY_BASE_PATH}${SLOS_PATH}/${encodeURI(sloId)}?instanceId=${encodeURI(
            instanceId
          )}`
        : `${OBSERVABILITY_BASE_PATH}${SLOS_PATH}/${encodeURI(sloId)}`,
  },
};

export const relativePaths = {
  observability: {
    ruleDetails: (ruleId: string) => `${RULES_PATH}/${encodeURI(ruleId)}`,
  },
};
