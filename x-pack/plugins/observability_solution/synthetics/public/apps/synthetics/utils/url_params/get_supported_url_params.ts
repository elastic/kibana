/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitorOverviewState } from '../../state';
import { CLIENT_DEFAULTS_SYNTHETICS } from '../../../../../common/constants/synthetics/client_defaults';
import { parseIsPaused } from './parse_is_paused';
import { parseUrlInt } from './parse_url_int';
import { CLIENT_DEFAULTS } from '../../../../../common/constants';
import { parseAbsoluteDate } from './parse_absolute_date';

// TODO: Change for Synthetics App if needed (Copied from legacy_uptime)
export interface SyntheticsUrlParams {
  absoluteDateRangeStart: number;
  absoluteDateRangeEnd: number;
  refreshInterval: number;
  refreshPaused: boolean;
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination?: string;
  filters: string;
  excludedFilters: string;
  search: string;
  statusFilter: string;
  focusConnectorField?: boolean;
  query?: string;
  tags?: string[];
  locations?: string[];
  monitorTypes?: string[] | string;
  status?: string[];
  locationId?: string;
  projects?: string[] | string;
  schedules?: string[] | string;
  groupBy?: MonitorOverviewState['groupBy']['field'];
  groupOrderBy?: MonitorOverviewState['groupBy']['order'];
  packagePolicyId?: string;
  cloneId?: string;
}

const { ABSOLUTE_DATE_RANGE_START, ABSOLUTE_DATE_RANGE_END, SEARCH, FILTERS, STATUS_FILTER } =
  CLIENT_DEFAULTS;

const { DATE_RANGE_START, DATE_RANGE_END, AUTOREFRESH_INTERVAL_SECONDS, AUTOREFRESH_IS_PAUSED } =
  CLIENT_DEFAULTS_SYNTHETICS;

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
}): SyntheticsUrlParams => {
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
    refreshInterval,
    refreshPaused,
    dateRangeStart,
    dateRangeEnd,
    filters,
    excludedFilters,
    search,
    statusFilter,
    pagination,
    focusConnectorField,
    query,
    tags,
    monitorTypes,
    locations,
    locationId,
    projects,
    schedules,
    groupBy,
    groupOrderBy,
    packagePolicyId,
  } = filteredParams;

  return {
    packagePolicyId: packagePolicyId || undefined,
    groupBy: groupBy as MonitorOverviewState['groupBy']['field'],
    groupOrderBy: groupOrderBy as MonitorOverviewState['groupBy']['order'],
    pagination,
    absoluteDateRangeStart: parseAbsoluteDate(
      dateRangeStart || DATE_RANGE_START,
      ABSOLUTE_DATE_RANGE_START
    ),
    absoluteDateRangeEnd: parseAbsoluteDate(
      dateRangeEnd || DATE_RANGE_END,
      ABSOLUTE_DATE_RANGE_END,
      { roundUp: true }
    ),
    refreshInterval: parseUrlInt(refreshInterval, AUTOREFRESH_INTERVAL_SECONDS),
    refreshPaused: parseIsPaused(refreshPaused, AUTOREFRESH_IS_PAUSED),
    dateRangeStart: dateRangeStart || DATE_RANGE_START,
    dateRangeEnd: dateRangeEnd || DATE_RANGE_END,
    filters: filters || FILTERS,
    excludedFilters: excludedFilters || '',
    search: search || SEARCH,
    statusFilter: statusFilter || STATUS_FILTER,
    focusConnectorField: !!focusConnectorField,
    query: query || '',
    tags: parseFilters(tags),
    monitorTypes: parseFilters(monitorTypes),
    locations: parseFilters(locations),
    projects: parseFilters(projects),
    schedules: parseFilters(schedules),
    locationId: locationId || undefined,
    cloneId: filteredParams.cloneId,
  };
};

const parseFilters = (filters?: string) => {
  if (!filters) {
    return [];
  }
  try {
    return JSON.parse(filters);
  } catch (e) {
    return [filters];
  }
};
