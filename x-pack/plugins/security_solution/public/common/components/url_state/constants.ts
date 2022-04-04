/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum CONSTANTS {
  appQuery = 'query',
  alertsPage = 'alerts.page',
  caseDetails = 'case.details',
  casePage = 'case.page',
  filters = 'filters',
  hostsDetails = 'hosts.details',
  hostsPage = 'hosts.page',
  management = 'management',
  networkDetails = 'network.details',
  networkPage = 'network.page',
  overviewPage = 'overview.page',
  savedQuery = 'savedQuery',
  sourcerer = 'sourcerer',
  timeline = 'timeline',
  timelinePage = 'timeline.page',
  timerange = 'timerange',
  unknown = 'unknown',
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
