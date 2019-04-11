/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import { Location } from 'history';
import { compact, pick } from 'lodash';
import {
  legacyDecodeURIComponent,
  toQuery
} from '../components/shared/Links/url_helpers';
import { LOCATION_UPDATE } from './location';
import { IReduxState } from './rootReducer';

// ACTION TYPES
export const TIME_RANGE_REFRESH = 'TIME_RANGE_REFRESH';
export const TIMEPICKER_DEFAULTS = {
  rangeFrom: 'now-24h',
  rangeTo: 'now',
  refreshPaused: 'true',
  refreshInterval: '0'
};

interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

interface LocationAction {
  type: typeof LOCATION_UPDATE;
  location: Location;
}
interface TimeRangeRefreshAction {
  type: typeof TIME_RANGE_REFRESH;
  time: TimeRange;
}
export type APMAction = LocationAction | TimeRangeRefreshAction;

function getParsedDate(rawDate?: string, opts = {}) {
  if (rawDate) {
    const parsed = datemath.parse(rawDate, opts);
    if (parsed) {
      return parsed.toISOString();
    }
  }
}

function getStart(prevState: IUrlParams, rangeFrom?: string) {
  if (prevState.rangeFrom !== rangeFrom) {
    return getParsedDate(rangeFrom);
  }
  return prevState.start;
}

function getEnd(prevState: IUrlParams, rangeTo?: string) {
  if (prevState.rangeTo !== rangeTo) {
    return getParsedDate(rangeTo, { roundUp: true });
  }
  return prevState.end;
}

// "urlParams" contains path and query parameters from the url, that can be easily consumed from
// any (container) component with access to the store

// Example:
// url: /opbeans-backend/Brewing%20Bot?transactionId=1321
// serviceName: opbeans-backend (path param)
// transactionType: Brewing%20Bot (path param)
// transactionId: 1321 (query param)
export function urlParamsReducer(
  state: IUrlParams = {},
  action: APMAction
): IUrlParams {
  switch (action.type) {
    case LOCATION_UPDATE: {
      const {
        processorEvent,
        serviceName,
        transactionName,
        transactionType,
        errorGroupId
      } = getPathParams(action.location.pathname);

      const {
        traceId,
        transactionId,
        detailTab,
        flyoutDetailTab,
        waterfallItemId,
        spanId,
        page,
        sortDirection,
        sortField,
        kuery,
        refreshPaused = TIMEPICKER_DEFAULTS.refreshPaused,
        refreshInterval = TIMEPICKER_DEFAULTS.refreshInterval,
        rangeFrom = TIMEPICKER_DEFAULTS.rangeFrom,
        rangeTo = TIMEPICKER_DEFAULTS.rangeTo
      } = toQuery(action.location.search);

      return removeUndefinedProps({
        ...state,

        // date params
        start: getStart(state, rangeFrom),
        end: getEnd(state, rangeTo),
        rangeFrom,
        rangeTo,
        refreshPaused: toBoolean(refreshPaused),
        refreshInterval: toNumber(refreshInterval),

        // query params
        sortDirection,
        sortField,
        page: toNumber(page) || 0,
        transactionId: toString(transactionId),
        traceId: toString(traceId),
        waterfallItemId: toString(waterfallItemId),
        detailTab: toString(detailTab),
        flyoutDetailTab: toString(flyoutDetailTab),
        spanId: toNumber(spanId),
        kuery: legacyDecodeURIComponent(kuery),

        // path params
        processorEvent,
        serviceName,
        transactionType: legacyDecodeURIComponent(transactionType),
        transactionName: legacyDecodeURIComponent(transactionName),
        errorGroupId
      });
    }

    case TIME_RANGE_REFRESH:
      return {
        ...state,
        start: getParsedDate(action.time.rangeFrom),
        end: getParsedDate(action.time.rangeTo)
      };

    default:
      return state;
  }
}

export function toNumber(value?: string) {
  if (value !== undefined) {
    return parseInt(value, 10);
  }
}

function toString(value?: string) {
  if (value === '' || value === 'null' || value === 'undefined') {
    return;
  }
  return value;
}

export function toBoolean(value?: string) {
  return value === 'true';
}

function getPathAsArray(pathname: string) {
  return compact(pathname.split('/'));
}

function removeUndefinedProps<T>(obj: T): Partial<T> {
  return pick(obj, value => value !== undefined);
}

function getPathParams(pathname: string) {
  const paths = getPathAsArray(pathname);
  const pageName = paths[1];

  switch (pageName) {
    case 'transactions':
      return {
        processorEvent: 'transaction',
        serviceName: paths[0],
        transactionType: paths[2],
        transactionName: paths[3]
      };
    case 'errors':
      return {
        processorEvent: 'error',
        serviceName: paths[0],
        errorGroupId: paths[2]
      };
    case 'metrics':
      return {
        processorEvent: 'metric',
        serviceName: paths[0]
      };
    default:
      return {};
  }
}

// ACTION CREATORS
export function refreshTimeRange(time: TimeRange): TimeRangeRefreshAction {
  return { type: TIME_RANGE_REFRESH, time };
}

// Selectors
export function getUrlParams(state: IReduxState) {
  return state.urlParams;
}

export interface IUrlParams {
  detailTab?: string;
  end?: string;
  errorGroupId?: string;
  flyoutDetailTab?: string;
  kuery?: string;
  rangeFrom?: string;
  rangeTo?: string;
  refreshInterval?: number;
  refreshPaused?: boolean;
  serviceName?: string;
  sortDirection?: string;
  sortField?: string;
  start?: string;
  traceId?: string;
  transactionId?: string;
  transactionName?: string;
  transactionType?: string;
  waterfallItemId?: string;
}
