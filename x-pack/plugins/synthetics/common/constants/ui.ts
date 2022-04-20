/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MONITOR_ROUTE = '/monitor/:monitorId?';

export const MONITOR_ADD_ROUTE = '/add-monitor';

export const MONITOR_EDIT_ROUTE = '/edit-monitor/:monitorId';

export const MONITOR_MANAGEMENT_ROUTE = '/manage-monitors';

export const OVERVIEW_ROUTE = '/';

export const SETTINGS_ROUTE = '/settings';

export const CERTIFICATES_ROUTE = '/certificates';

export const STEP_DETAIL_ROUTE = '/journey/:checkGroupId/step/:stepIndex';

export const SYNTHETIC_CHECK_STEPS_ROUTE = '/journey/:checkGroupId/steps';

export const MAPPING_ERROR_ROUTE = '/mapping-error';

export enum STATUS {
  UP = 'up',
  DOWN = 'down',
  COMPLETE = 'complete',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum MONITOR_TYPES {
  HTTP = 'http',
  TCP = 'tcp',
  ICMP = 'icmp',
  BROWSER = 'browser',
}

export const ML_JOB_ID = 'high_latency_by_geo';

export const ML_MODULE_ID = 'uptime_heartbeat';

export const UNNAMED_LOCATION = 'Unnamed-location';

export const SHORT_TS_LOCALE = 'en-short-locale';

export const SHORT_TIMESPAN_LOCALE = {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: '%ds',
    ss: '%ss',
    m: '%dm',
    mm: '%dm',
    h: '%dh',
    hh: '%dh',
    d: '%dd',
    dd: '%dd',
    M: '%d Mon',
    MM: '%d Mon',
    y: '%d Yr',
    yy: '%d Yr',
  },
};

export enum CERT_STATUS {
  OK = 'OK',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  TOO_OLD = 'TOO_OLD',
}

export const KQL_SYNTAX_LOCAL_STORAGE = 'xpack.uptime.kql.syntax';

export const FILTER_FIELDS = {
  TAGS: 'tags',
  PORT: 'url.port',
  LOCATION: 'observer.geo.name',
  TYPE: 'monitor.type',
};

export const SYNTHETICS_INDEX_PATTERN = 'synthetics-*';
