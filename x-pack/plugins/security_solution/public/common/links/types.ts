/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AppDeepLink, AppNavLinkStatus } from '@kbn/core/public';
export const enum SecurityPageName {
  administration = 'administration',
  alerts = 'alerts',
  /*
   * Warning: Computed values are not permitted in an enum with string valued members
   * The 3 following Cases page names must match `CasesDeepLinkId` in x-pack/plugins/cases/public/common/navigation.ts
   */
  blocklist = 'blocklist',
  case = 'cases',
  caseConfigure = 'cases_configure',
  caseCreate = 'cases_create',
  detections = 'detections',
  detectionAndResponse = 'detection_response',
  endpoints = 'endpoints',
  eventFilters = 'event_filters',
  exceptions = 'exceptions',
  explore = 'explore',
  hostIsolationExceptions = 'host_isolation_exceptions',
  hosts = 'hosts',
  hostsAnomalies = 'hosts-anomalies',
  hostsExternalAlerts = 'hosts-external_alerts',
  hostsRisk = 'hosts-risk',
  hostsEvents = 'hosts-events',
  hostsAuthentications = 'hosts-authentications',
  investigate = 'investigate',
  landing = 'get_started',
  network = 'network',
  networkAnomalies = 'network-anomalies',
  networkDns = 'network-dns',
  networkExternalAlerts = 'network-external_alerts',
  networkHttp = 'network-http',
  networkTls = 'network-tls',
  overview = 'overview',
  policies = 'policy',
  rules = 'rules',
  timelines = 'timelines',
  timelinesTemplates = 'timelines-templates',
  trustedApps = 'trusted_apps',
  uncommonProcesses = 'uncommon_processes',
  users = 'users',
  usersAuthentications = 'users-authentications',
  usersAnomalies = 'users-anomalies',
  usersRisk = 'users-risk',
  sessions = 'sessions',
  usersEvents = 'users-events',
  usersExternalAlerts = 'users-external_alerts',
}
export type UrlStateType =
  | 'administration'
  | 'alerts'
  | 'cases'
  | 'detection_response'
  | 'exceptions'
  | 'get_started'
  | 'host'
  | 'users'
  | 'network'
  | 'overview'
  | 'rules'
  | 'timeline';

export interface AppDeepLinks {
  deepLinks?: AppDeepLink[];
  euiIconType?: string;
  icon?: string;
  id: string;
  keywords?: string[];
  navLinkStatus?: AppNavLinkStatus;
  order?: number;
  path: string;
  searchable?: boolean;
  title: string;
  tooltip?: string;
}

export interface NavLinkItem {
  description?: string;
  groupTitle?: string;
  href: string;
  id: string;
  items?: AppDeepLinks[];
  label: string;
  landingIcon?: string;
  landingImage?: string;
}

export interface NavTab {
  disabled: boolean;
  href: string;
  id: string;
  isBeta?: boolean;
  name: string;
  pageId?: SecurityPageName;
  urlKey?: UrlStateType;
}
