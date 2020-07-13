/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum CONSTANTS {
  appQuery = 'query',
  caseDetails = 'case.details',
  casePage = 'case.page',
  detectionsPage = 'detections.page',
  filters = 'filters',
  hostsDetails = 'hosts.details',
  hostsPage = 'hosts.page',
  management = 'management',
  networkDetails = 'network.details',
  networkPage = 'network.page',
  overviewPage = 'overview.page',
  savedQuery = 'savedQuery',
  timeline = 'timeline',
  timelinePage = 'timeline.page',
  timerange = 'timerange',
  unknown = 'unknown',
}

export type UrlStateType =
  | 'case'
  | 'detections'
  | 'host'
  | 'network'
  | 'overview'
  | 'timeline'
  | 'management';
