/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CLIENT_DEFAULTS = {
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
  FILTERS: '',
  PAGINATION: '',
  SEARCH: '',
  STATUS_FILTER: '',
};

export const URL_PARAM_DEFAULT_MAPPING: { [key: string]: string | number | boolean } = {
  autorefreshInterval: CLIENT_DEFAULTS.AUTOREFRESH_INTERVAL,
  autorefreshIsPaused: CLIENT_DEFAULTS.AUTOREFRESH_IS_PAUSED,
  dateRangeStart: CLIENT_DEFAULTS.DATE_RANGE_START,
  dateRangeEnd: CLIENT_DEFAULTS.DATE_RANGE_END,
  filters: CLIENT_DEFAULTS.FILTERS,
  pagination: CLIENT_DEFAULTS.PAGINATION,
  search: CLIENT_DEFAULTS.SEARCH,
  statusFilter: CLIENT_DEFAULTS.STATUS_FILTER,
};
