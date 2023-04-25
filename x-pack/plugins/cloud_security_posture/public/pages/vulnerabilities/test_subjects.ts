/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FINDINGS_VULNERABILITY_FLYOUT = 'vulnerability_findings_flyout';
export const JSON_TAB_VULNERABILITY_FLYOUT = 'vulnerability_json_tab_flyout';
export const OVERVIEW_TAB_VULNERABILITY_FLYOUT = 'vulnerability_overview_tab_flyout';
export const SEVERITY_STATUS_VULNERABILITY_FLYOUT = 'vulnerability_severity_status_flyout';
export const TAB_ID_VULNERABILITY_FLYOUT = (tabId: string) =>
  `vulnerability-finding-flyout-tab-${tabId}`;
