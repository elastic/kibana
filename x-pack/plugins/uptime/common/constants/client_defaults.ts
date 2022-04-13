/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLIENT_DEFAULTS = {
  ABSOLUTE_DATE_RANGE_START: 0,
  // 15 minutes
  ABSOLUTE_DATE_RANGE_END: 1000 * 60 * 15,
  /**
   * The application auto refreshes every 60s by default.
   */
  AUTOREFRESH_INTERVAL: 60 * 1000,
  /**
   * The application's autorefresh feature is enabled.
   */
  AUTOREFRESH_IS_PAUSED: false,

  COMMONLY_USED_DATE_RANGES: [
    { start: 'now/d', end: 'now', label: 'Today' },
    { start: 'now/w', end: 'now', label: 'Week to date' },
    { start: 'now/M', end: 'now', label: 'Month to date' },
    { start: 'now/y', end: 'now', label: 'Year to date' },
  ],
  /**
   * The beginning of the default date range is 15m ago.
   */
  DATE_RANGE_START: 'now-15m',
  /**
   * The end of the default date range is now.
   */
  DATE_RANGE_END: 'now',
  FOCUS_CONNECTOR_FIELD: false,
  FILTERS: '',
  MONITOR_LIST_PAGE_INDEX: 0,
  MONITOR_LIST_PAGE_SIZE: 20,
  MONITOR_LIST_SORT_DIRECTION: 'asc',
  MONITOR_LIST_SORT_FIELD: 'monitor_id',
  SEARCH: '',
  STATUS_FILTER: '',
};

export const EXCLUDE_RUN_ONCE_FILTER = { bool: { must_not: { exists: { field: 'run_once' } } } };
