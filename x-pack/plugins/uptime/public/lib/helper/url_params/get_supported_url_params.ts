/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseBooleanParam } from './parse_boolean_param';
import { parseIntParam } from './parse_int_param';
import { CLIENT_DEFAULTS } from '../../../../common/constants';

export interface UptimeUrlParams {
  autorefreshInterval: number;
  autorefreshIsPaused: boolean;
  dateRangeStart: string;
  dateRangeEnd: string;
  monitorListPage: string;
  monitorListSize: number;
  search: string;
  selectedPingStatus: string;
}

const {
  AUTOREFRESH_INTERVAL,
  AUTOREFRESH_IS_PAUSED,
  DATE_RANGE_START,
  DATE_RANGE_END,
  MONITOR_LIST_PAGE,
  MONITOR_LIST_SIZE,
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
    monitorListPage,
    monitorListSize,
    search,
    selectedPingStatus,
  } = params;

  return {
    autorefreshInterval: parseIntParam(autorefreshInterval, AUTOREFRESH_INTERVAL),
    autorefreshIsPaused: parseBooleanParam(autorefreshIsPaused, AUTOREFRESH_IS_PAUSED),
    dateRangeStart: dateRangeStart || DATE_RANGE_START,
    dateRangeEnd: dateRangeEnd || DATE_RANGE_END,
    monitorListPage: monitorListPage || MONITOR_LIST_PAGE,
    monitorListSize: parseIntParam(monitorListSize, MONITOR_LIST_SIZE),
    search: search || SEARCH,
    selectedPingStatus:
      selectedPingStatus === undefined ? SELECTED_PING_LIST_STATUS : selectedPingStatus,
  };
};
