/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTS_URL = 'app/security/alerts';
export const DETECTIONS_RULE_MANAGEMENT_URL = 'app/security/rules';
export const ruleDetailsUrl = (ruleId: string) => `app/security/rules/id/${ruleId}`;
export const detectionsRuleDetailsUrl = (ruleId: string) =>
  `app/security/detections/rules/id/${ruleId}`;

export const ruleEditUrl = (ruleId: string) => `${ruleDetailsUrl(ruleId)}/edit`;
export const detectionRuleEditUrl = (ruleId: string) => `${detectionsRuleDetailsUrl(ruleId)}/edit`;

export const CASES_URL = '/app/security/cases';
export const DETECTIONS = '/app/siem#/detections';
export const SECURITY_DETECTIONS_URL = '/app/security/detections';
export const SECURITY_DETECTIONS_RULES_URL = '/app/security/detections/rules';
export const SECURITY_DETECTIONS_RULES_CREATION_URL = '/app/security/detections/rules/create';

export const EXCEPTIONS_URL = 'app/security/exceptions';

export const HOSTS_URL = '/app/security/hosts/allHosts';

export const hostDetailsUrl = (hostName: string) =>
  `/app/security/hosts/${hostName}/authentications`;

export const USERS_URL = '/app/security/users/allUsers';

export const userDetailsUrl = (userName: string) => `/app/security/users/${userName}/allUsers`;

export const HOSTS_PAGE_TAB_URLS = {
  allHosts: '/app/security/hosts/allHosts',
  anomalies: '/app/security/hosts/anomalies',
  authentications: '/app/security/hosts/authentications',
  events: '/app/security/hosts/events',
  uncommonProcesses: '/app/security/hosts/uncommonProcesses',
};
export const KIBANA_HOME = '/app/home#/';
export const KIBANA_SAVED_OBJECTS = '/app/management/kibana/objects';
export const ENDPOINTS_URL = '/app/security/administration/endpoints';
export const TRUSTED_APPS_URL = '/app/security/administration/trusted_apps';
export const EVENT_FILTERS_URL = '/app/security/administration/event_filters';
export const NETWORK_URL = '/app/security/network';
export const OVERVIEW_URL = '/app/security/overview';
export const RULE_CREATION = 'app/security/rules/create';
export const TIMELINES_URL = '/app/security/timelines';
export const TIMELINE_TEMPLATES_URL = '/app/security/timelines/template';
export const LOGOUT_URL = '/logout';
