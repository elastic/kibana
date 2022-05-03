/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';
import { toQuery } from '@kbn/observability-plugin/public';
import { uxLocalUIFilterNames } from '../../../common/ux_ui_filter';
import { pickKeys } from '../../../common/utils/pick_keys';
import {
  getDateRange,
  removeUndefinedProps,
  toBoolean,
  toNumber,
  toString,
} from './helpers';
import { UrlParams, UxUrlParams } from './types';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

type TimeUrlParams = Pick<
  UrlParams,
  'start' | 'end' | 'rangeFrom' | 'rangeTo' | 'exactStart' | 'exactEnd'
>;

export function resolveUrlParams(location: Location, state: TimeUrlParams) {
  const query = toQuery(location.search) as UxUrlParams;

  const {
    page,
    pageSize,
    sortDirection,
    sortField,
    refreshPaused,
    refreshInterval,
    rangeFrom,
    rangeTo,
    environment,
    searchTerm,
    percentile,
  } = query;

  const localUIFilters = pickKeys(query, ...uxLocalUIFilterNames);

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
    searchTerm: toString(searchTerm),
    percentile: toNumber(percentile),

    ...localUIFilters,
  });
}
