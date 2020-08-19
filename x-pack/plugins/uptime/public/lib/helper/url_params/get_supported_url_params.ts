/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseIsPaused } from './parse_is_paused';
import { parseUrlInt } from './parse_url_int';
import { CLIENT_DEFAULTS } from '../../../../common/constants';
import { parseAbsoluteDate } from './parse_absolute_date';

export interface UptimeUrlParams {
  absoluteDateRangeStart: number;
  absoluteDateRangeEnd: number;
  autorefreshInterval: number;
  autorefreshIsPaused: boolean;
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination?: string;
  filters: string;
  search: string;
  selectedPingStatus: string;
  statusFilter: string;
  focusConnectorField?: boolean;
}

const {
  ABSOLUTE_DATE_RANGE_START,
  ABSOLUTE_DATE_RANGE_END,
  AUTOREFRESH_INTERVAL,
  AUTOREFRESH_IS_PAUSED,
  DATE_RANGE_START,
  DATE_RANGE_END,
  SEARCH,
  SELECTED_PING_LIST_STATUS,
  FILTERS,
  STATUS_FILTER,
} = CLIENT_DEFAULTS;

/**
 * Gets the current URL values for the application. If no item is present
 * for the URL, a default value is supplied.
 *
 * @param params A set of key-value pairs where the value is either
 * undefined or a string/string array. If a string array is passed,
 * only the first item is chosen. Support for lists in the URL will
 * require further development.
 */
export const getSupportedUrlParams = (params: {
  [key: string]: string | string[] | undefined | null;
}): UptimeUrlParams => {
  const filteredParams: { [key: string]: string | undefined } = {};
  Object.keys(params).forEach((key) => {
    let value: string | undefined;
    if (params[key] === undefined) {
      value = undefined;
    } else if (Array.isArray(params[key])) {
      // @ts-ignore this must be an array, and it's ok if the
      // 0th element is undefined
      value = params[key][0];
    } else {
      // @ts-ignore this will not be an array because the preceding
      // block tests for that
      value = params[key];
    }
    filteredParams[key] = value;
  });

  const {
    autorefreshInterval,
    autorefreshIsPaused,
    dateRangeStart,
    dateRangeEnd,
    filters,
    search,
    selectedPingStatus,
    statusFilter,
    pagination,
    focusConnectorField,
  } = filteredParams;

  return {
    absoluteDateRangeStart: parseAbsoluteDate(
      dateRangeStart || DATE_RANGE_START,
      ABSOLUTE_DATE_RANGE_START
    ),
    absoluteDateRangeEnd: parseAbsoluteDate(
      dateRangeEnd || DATE_RANGE_END,
      ABSOLUTE_DATE_RANGE_END,
      { roundUp: true }
    ),
    autorefreshInterval: parseUrlInt(autorefreshInterval, AUTOREFRESH_INTERVAL),
    autorefreshIsPaused: parseIsPaused(autorefreshIsPaused, AUTOREFRESH_IS_PAUSED),
    dateRangeStart: dateRangeStart || DATE_RANGE_START,
    dateRangeEnd: dateRangeEnd || DATE_RANGE_END,
    filters: filters || FILTERS,
    search: search || SEARCH,
    selectedPingStatus:
      selectedPingStatus === undefined ? SELECTED_PING_LIST_STATUS : selectedPingStatus,
    statusFilter: statusFilter || STATUS_FILTER,
    pagination,
    focusConnectorField: !!focusConnectorField,
  };
};
