/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KIBANA_HOME = '/app/home#/';
export const KIBANA_SAVED_OBJECTS = '/app/management/kibana/objects';

export const ALERTS_URL = 'app/security/alerts';
export const ENDPOINTS_URL = '/app/security/administration/endpoints';
export const POLICIES_URL = '/app/security/administration/policy';
export const USERS_URL = '/app/security/users/allUsers';
export const DETECTIONS_RESPONSE_URL = '/app/security/detection_response';
export const TRUSTED_APPS_URL = '/app/security/administration/trusted_apps';
export const EVENT_FILTERS_URL = '/app/security/administration/event_filters';
export const BLOCKLIST_URL = '/app/security/administration/blocklist';
export const CSP_BENCHMARKS_URL = '/app/security/cloud_security_posture/benchmarks';
export const NETWORK_URL = '/app/security/network';
export const OVERVIEW_URL = '/app/security/overview';
export const DASHBOARDS_URL = '/app/security/dashboards';
export const DETECTION_RESPONSE_URL = '/app/security/detection_response';
export const KUBERNETES_URL = '/app/security/kubernetes';
export const CSP_DASHBOARD_URL = '/app/security/cloud_security_posture/dashboard';
export const INDICATORS_URL = '/app/security/threat_intelligence/indicators';
export const EXPLORE_URL = '/app/security/explore';
export const MANAGE_URL = '/app/security/manage';
export const RULE_CREATION = 'app/security/rules/create';
export const TIMELINES_URL = '/app/security/timelines';
export const TIMELINE_TEMPLATES_URL = '/app/security/timelines/template';
export const CASES_URL = '/app/security/cases';
export const EXCEPTIONS_URL = 'app/security/exceptions';
export const HOSTS_URL = '/app/security/hosts/allHosts';
export const CSP_FINDINGS_URL = 'app/security/cloud_security_posture/findings';
export const DETECTIONS_RULE_MANAGEMENT_URL = 'app/security/rules';
export const DETECTIONS = '/app/siem#/detections';
export const SECURITY_DETECTIONS_URL = '/app/security/detections';
export const SECURITY_DETECTIONS_RULES_URL = '/app/security/detections/rules';
export const SECURITY_DETECTIONS_RULES_CREATION_URL = '/app/security/detections/rules/create';

export const HOSTS_PAGE_TAB_URLS = {
  allHosts: '/app/security/hosts/allHosts',
  anomalies: '/app/security/hosts/anomalies',
  events: '/app/security/hosts/events',
  uncommonProcesses: '/app/security/hosts/uncommonProcesses',
};
export const LOGOUT_URL = '/logout';

export const DISCOVER_WITH_FILTER_URL =
  "/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now%2Fd,to:now%2Fd))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:security-solution-default,key:host.name,negate:!f,params:(query:test-host),type:phrase),query:(match_phrase:(host.name:test-host)))),index:security-solution-default,interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))";
export const DISCOVER_WITH_PINNED_FILTER_URL =
  "/app/discover#/?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,index:security-solution-default,key:host.name,negate:!f,params:(query:test-host),type:phrase),query:(match_phrase:(host.name:test-host)))),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(),filters:!(),index:security-solution-default,interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))";

export const ruleDetailsUrl = (ruleId: string) => `app/security/rules/id/${ruleId}`;
export const detectionsRuleDetailsUrl = (ruleId: string) =>
  `app/security/detections/rules/id/${ruleId}`;

export const ruleEditUrl = (ruleId: string) => `${ruleDetailsUrl(ruleId)}/edit`;
export const detectionRuleEditUrl = (ruleId: string) => `${detectionsRuleDetailsUrl(ruleId)}/edit`;

export const hostDetailsUrl = (hostName: string) =>
  `/app/security/hosts/${hostName}/authentications`;

export const userDetailsUrl = (userName: string) => `/app/security/users/${userName}/allUsers`;
