/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseIsPaused } from './parse_is_paused';
import { parseAutorefreshInterval } from './parse_autorefresh_interval';
import { CLIENT_DEFAULTS } from '../../../../common/constants';

export interface UptimeUrlParams {
  autorefreshInterval: number;
  autorefreshIsPaused: boolean;
  dateRangeStart: string;
  dateRangeEnd: string;
  search: string;
  selectedPingStatus: string;
}

const {
  AUTOREFRESH_INTERVAL,
  AUTOREFRESH_IS_PAUSED,
  DATE_RANGE_START,
  DATE_RANGE_END,
  SEARCH,
  SELECTED_PING_LIST_STATUS,
} = CLIENT_DEFAULTS;

export const getSupportedUrlParams = (params: {
  [key: string]: string | undefined;
}): UptimeUrlParams => {
  const {
    autorefreshInterval,
    autorefreshIsPaused,
    dateRangeStart,
    dateRangeEnd,
    search,
    selectedPingStatus,
  } = params;

  return {
    autorefreshInterval: parseAutorefreshInterval(autorefreshInterval, AUTOREFRESH_INTERVAL),
    autorefreshIsPaused: parseIsPaused(autorefreshIsPaused, AUTOREFRESH_IS_PAUSED),
    dateRangeStart: dateRangeStart || DATE_RANGE_START,
    dateRangeEnd: dateRangeEnd || DATE_RANGE_END,
    search: search || SEARCH,
    selectedPingStatus:
      selectedPingStatus === undefined ? SELECTED_PING_LIST_STATUS : selectedPingStatus,
  };
};
