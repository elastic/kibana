/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import { isBoolean, isNumber, isString } from 'lodash/fp';

import {
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_APP_REFRESH_INTERVAL,
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_TYPE,
  DEFAULT_INTERVAL_VALUE,
} from '../../../common/constants';
import { KibanaServices } from '../lib/kibana';
import { Policy } from '../store/inputs/model';

interface DefaultTimeRange {
  from?: string | null;
  to?: string | null;
}

interface DefaultInterval {
  pause?: boolean | null;
  value?: number | null;
}

export type DefaultTimeRangeSetting = DefaultTimeRange | null | undefined;
export type DefaultIntervalSetting = DefaultInterval | null | undefined;

// Defaults for if everything fails including dateMath.parse(DEFAULT_FROM) or dateMath.parse(DEFAULT_TO)
// These should not really be hit unless we are in an extreme buggy state.
const DEFAULT_FROM_MOMENT = moment().subtract(24, 'hours');
const DEFAULT_TO_MOMENT = moment();

/**
 * Retrieves timeRange settings to populate filters
 *
 * @param {Boolean} uiSettings Whether to respect the user's UI settings. Defaults to true.
 */
export const getTimeRangeSettings = (uiSettings = true) => {
  const timeRange = uiSettings
    ? KibanaServices.get().uiSettings.get<DefaultTimeRangeSetting>(DEFAULT_APP_TIME_RANGE)
    : null;

  const fromStr = (isString(timeRange?.from) && timeRange?.from) || DEFAULT_FROM;
  const toStr = (isString(timeRange?.to) && timeRange?.to) || DEFAULT_TO;
  const from = parseDateWithDefault(fromStr, DEFAULT_FROM_MOMENT).valueOf();
  const to = parseDateWithDefault(toStr, DEFAULT_TO_MOMENT).valueOf();

  return { from, fromStr, to, toStr };
};

/**
 * Retrieves refreshInterval settings to populate filters
 *
 * @param {Boolean} uiSettings Whether to respect the user's UI settings. Defaults to true.
 */
export const getIntervalSettings = (uiSettings = true): Policy => {
  const interval = uiSettings
    ? KibanaServices.get().uiSettings.get<DefaultIntervalSetting>(DEFAULT_APP_REFRESH_INTERVAL)
    : null;

  const duration = (isNumber(interval?.value) && interval?.value) || DEFAULT_INTERVAL_VALUE;
  const kind = isBoolean(interval?.pause) && !interval?.pause ? 'interval' : DEFAULT_INTERVAL_TYPE;

  return { kind, duration };
};

export const parseDateWithDefault = (
  dateString: string,
  defaultDate: moment.Moment
): moment.Moment => {
  const date = dateMath.parse(dateString);
  if (date != null && date.isValid()) {
    return date;
  } else {
    return defaultDate;
  }
};
