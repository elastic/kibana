/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { pickKeys } from '../../../common/utils/pick_keys';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { localUIFilterNames } from '../../../server/lib/ui_filters/local_ui_filters/config';
import { toQuery } from '../../components/shared/Links/url_helpers';
import {
  getEnd,
  getStart,
  removeUndefinedProps,
  toBoolean,
  toNumber,
  toString,
} from './helpers';
import { IUrlParams } from './types';

type TimeUrlParams = Pick<
  IUrlParams,
  'start' | 'end' | 'rangeFrom' | 'rangeTo'
>;

export function resolveUrlParams(location: Location, state: TimeUrlParams) {
  const query = toQuery(location.search);

  const {
    traceId,
    transactionId,
    transactionName,
    transactionType,
    detailTab,
    flyoutDetailTab,
    waterfallItemId,
    spanId,
    page,
    pageSize,
    sortDirection,
    sortField,
    kuery,
    refreshPaused,
    refreshInterval,
    rangeFrom,
    rangeTo,
    environment,
    searchTerm,
    percentile,
    latencyAggregationType = LatencyAggregationType.avg,
  } = query;

  const localUIFilters = pickKeys(query, ...localUIFilterNames);

  return removeUndefinedProps({
    // date params
    start: getStart(state, rangeFrom),
    end: getEnd(state, rangeTo),
    rangeFrom,
    rangeTo,
    refreshPaused: refreshPaused ? toBoolean(refreshPaused) : undefined,
    refreshInterval: refreshInterval ? toNumber(refreshInterval) : undefined,

    // query params
    sortDirection,
    sortField,
    page: toNumber(page) || 0,
    pageSize: pageSize ? toNumber(pageSize) : undefined,
    transactionId: toString(transactionId),
    traceId: toString(traceId),
    waterfallItemId: toString(waterfallItemId),
    detailTab: toString(detailTab),
    flyoutDetailTab: toString(flyoutDetailTab),
    spanId: toNumber(spanId),
    kuery: kuery && decodeURIComponent(kuery),
    transactionName,
    transactionType,
    searchTerm: toString(searchTerm),
    percentile: toNumber(percentile),
    latencyAggregationType,

    // ui filters
    environment,
    ...localUIFilters,
  });
}
