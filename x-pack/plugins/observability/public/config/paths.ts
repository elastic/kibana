/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERT_PAGE_LINK = '/app/observability/alerts';
export const RULES_PAGE_LINK = `${ALERT_PAGE_LINK}/rules`;

export const paths = {
  observability: {
    alerts: ALERT_PAGE_LINK,
    rules: RULES_PAGE_LINK,
    ruleDetails: (ruleId?: string | null) =>
      ruleId ? `${RULES_PAGE_LINK}/${encodeURI(ruleId)}` : RULES_PAGE_LINK,
  },
  management: {
    rules: '/app/management/insightsAndAlerting/triggersActions/rules',
    ruleDetails: (ruleId: string) =>
      `/app/management/insightsAndAlerting/triggersActions/rule/${encodeURI(ruleId)}`,
    alertDetails: (alertId: string) =>
      `/app/management/insightsAndAlerting/triggersActions/alert/${encodeURI(alertId)}`,
  },
};
