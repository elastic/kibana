/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import { Location } from 'history';
import { compact, pick } from 'lodash';
import { createSelector } from 'reselect';
import {
  legacyDecodeURIComponent,
  toQuery
} from '../components/shared/Links/url_helpers';
import { LOCATION_UPDATE } from './location';
import { getDefaultTransactionType } from './reactReduxRequest/serviceDetails';
import { getDefaultDistributionSample } from './reactReduxRequest/transactionDistribution';
import { IReduxState } from './rootReducer';

// ACTION TYPES
export const TIMEPICKER_UPDATE = 'TIMEPICKER_UPDATE';
export const TIMEPICKER_DEFAULTS = {
  rangeFrom: 'now-24h',
  rangeTo: 'now',
  refreshPaused: 'true',
  refreshInterval: '0'
};

function calculateTimePickerDefaults() {
  const parsed = {
    from: datemath.parse(TIMEPICKER_DEFAULTS.rangeFrom),
    // roundUp: true is required for the quick select relative date values to work properly
    to: datemath.parse(TIMEPICKER_DEFAULTS.rangeTo, { roundUp: true })
  };

  const result: IUrlParams = {};
  if (parsed.from) {
    result.start = parsed.from.toISOString();
  }
  if (parsed.to) {
    result.end = parsed.to.toISOString();
  }
  return result;
}

const INITIAL_STATE: IUrlParams = calculateTimePickerDefaults();

interface LocationAction {
  type: typeof LOCATION_UPDATE;
  location: Location;
}
interface TimepickerAction {
  type: typeof TIMEPICKER_UPDATE;
  time: { min: string; max: string };
}
export type APMAction = LocationAction | TimepickerAction;

// "urlParams" contains path and query parameters from the url, that can be easily consumed from
// any (container) component with access to the store

// Example:
// url: /opbeans-backend/Brewing%20Bot?transactionId=1321
// serviceName: opbeans-backend (path param)
// transactionType: Brewing%20Bot (path param)
// transactionId: 1321 (query param)
export function urlParamsReducer(state = INITIAL_STATE, action: APMAction) {
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
        kuery
      } = toQuery(action.location.search);

      return removeUndefinedProps({
        ...state,

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

    case TIMEPICKER_UPDATE:
      return {
        ...state,
        start: action.time.min,
        end: action.time.max
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

function toString(str?: string | string[]) {
  if (
    str === '' ||
    str === 'null' ||
    str === 'undefined' ||
    Array.isArray(str)
  ) {
    return;
  }
  return str;
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

interface TimeUpdate {
  min: string;
  max: string;
}

// ACTION CREATORS
export function updateTimePicker(time: TimeUpdate) {
  return { type: TIMEPICKER_UPDATE, time };
}

// Selectors
export const getUrlParams = createSelector(
  (state: IReduxState) => state.urlParams,
  getDefaultTransactionType,
  getDefaultDistributionSample,
  (
    urlParams,
    transactionType: string,
    { traceId, transactionId }
  ): IUrlParams => {
    return {
      transactionType,
      transactionId,
      traceId,
      ...urlParams
    };
  }
);

export interface IUrlParams {
  detailTab?: string;
  end?: string;
  errorGroupId?: string;
  flyoutDetailTab?: string;
  kuery?: string;
  serviceName?: string;
  sortField?: string;
  sortDirection?: string;
  start?: string;
  traceId?: string;
  transactionId?: string;
  transactionName?: string;
  transactionType?: string;
  waterfallItemId?: string;
}
