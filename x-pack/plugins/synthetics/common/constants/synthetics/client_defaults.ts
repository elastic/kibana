/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLIENT_DEFAULTS_SYNTHETICS = {
  /**
   * The beginning of the default date range is 15m ago.
   */
  DATE_RANGE_START: 'now-24h',
  /**
   * The end of the default date range is now.
   */
  DATE_RANGE_END: 'now',

  /**
   * The application auto refreshes every 30s by default.
   */
  AUTOREFRESH_INTERVAL_SECONDS: 60,
  /**
   * The application's autorefresh feature is enabled.
   */
  AUTOREFRESH_IS_PAUSED: false,
};
