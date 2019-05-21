/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { IUrlParams } from './types';
import {
  getPathParams,
  removeUndefinedProps,
  getStart,
  getEnd,
  toBoolean,
  toNumber,
  toString
} from './helpers';
import {
  toQuery,
  legacyDecodeURIComponent
} from '../../components/shared/Links/url_helpers';
import { TIMEPICKER_DEFAULTS } from './constants';

export function resolveUrlParams(location: Location, state: IUrlParams) {
  const {
    processorEvent,
    serviceName,
    transactionName,
    transactionType,
    errorGroupId
  } = getPathParams(location.pathname);

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
  } = toQuery(location.search);

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
