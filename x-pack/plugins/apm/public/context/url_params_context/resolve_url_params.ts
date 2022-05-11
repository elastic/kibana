/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { toQuery } from '../../components/shared/links/url_helpers';
import {
  getDateRange,
  removeUndefinedProps,
  toBoolean,
  toNumber,
  toString,
} from './helpers';
import { UrlParams } from './types';

type TimeUrlParams = Pick<UrlParams, 'start' | 'end' | 'rangeFrom' | 'rangeTo'>;

export function resolveUrlParams(location: Location, state: TimeUrlParams) {
  const query = toQuery(location.search);

  const {
    sampleRangeFrom,
    sampleRangeTo,
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
    comparisonEnabled,
    offset,
  } = query;

  return removeUndefinedProps({
    // date params
    ...getDateRange({ state, rangeFrom, rangeTo }),
    rangeFrom,
    rangeTo,
    refreshPaused: refreshPaused ? toBoolean(refreshPaused) : undefined,
    refreshInterval: refreshInterval ? toNumber(refreshInterval) : undefined,

    // query params
    environment: toString(environment) || ENVIRONMENT_ALL.value,
    sortDirection,
    sortField,
    page: toNumber(page) || 0,
    pageSize: pageSize ? toNumber(pageSize) : undefined,
    transactionId: toString(transactionId),
    traceId: toString(traceId),
    sampleRangeFrom: sampleRangeFrom ? toNumber(sampleRangeFrom) : undefined,
    sampleRangeTo: sampleRangeTo ? toNumber(sampleRangeTo) : undefined,
    waterfallItemId: toString(waterfallItemId),
    detailTab: toString(detailTab),
    flyoutDetailTab: toString(flyoutDetailTab),
    spanId: toNumber(spanId),
    kuery,
    transactionName,
    transactionType,
    searchTerm: toString(searchTerm),
    percentile: toNumber(percentile),
    latencyAggregationType: latencyAggregationType as LatencyAggregationType,
    comparisonEnabled: comparisonEnabled
      ? toBoolean(comparisonEnabled)
      : undefined,
    offset,
  });
}
