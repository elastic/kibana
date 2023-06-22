/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const OBSERVABILITY_BASE_PATH = '/app/observability';
export const ALERT_PAGE_LINK = `${OBSERVABILITY_BASE_PATH}/alerts`;
export const RULES_PAGE_LINK = `${ALERT_PAGE_LINK}/rules`;
export const SLOS_PAGE_LINK = `${OBSERVABILITY_BASE_PATH}/slos`;

export const paths = {
  observability: {
    alerts: ALERT_PAGE_LINK,
    alertDetails: (alertId: string) => `${ALERT_PAGE_LINK}/${encodeURI(alertId)}`,
    rules: RULES_PAGE_LINK,
    ruleDetails: (ruleId?: string | null) =>
      ruleId ? `${RULES_PAGE_LINK}/${encodeURI(ruleId)}` : RULES_PAGE_LINK,
    slos: SLOS_PAGE_LINK,
    slosWelcome: `${SLOS_PAGE_LINK}/welcome`,
    sloCreate: `${SLOS_PAGE_LINK}/create`,
    sloEdit: (sloId: string) => `${SLOS_PAGE_LINK}/edit/${encodeURI(sloId)}`,
    sloDetails: (sloId: string) => `${SLOS_PAGE_LINK}/${encodeURI(sloId)}`,
  },
  management: {
    rules: '/app/management/insightsAndAlerting/triggersActions/rules',
    ruleDetails: (ruleId: string) =>
      `/app/management/insightsAndAlerting/triggersActions/rule/${encodeURI(ruleId)}`,
    alertDetails: (alertId: string) =>
      `/app/management/insightsAndAlerting/triggersActions/alert/${encodeURI(alertId)}`,
  },
};
