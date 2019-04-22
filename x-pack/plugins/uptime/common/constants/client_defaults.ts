/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CLIENT_DEFAULTS = {
  // 60 seconds
  AUTOREFRESH_INTERVAL: 60 * 1000,
  // polling defaults to "on"
  AUTOREFRESH_IS_PAUSED: false,
  DATE_RANGE_START: 'now-15m',
  DATE_RANGE_END: 'now',
  SEARCH: '',
  SELECTED_PING_LIST_STATUS: 'down',
};
