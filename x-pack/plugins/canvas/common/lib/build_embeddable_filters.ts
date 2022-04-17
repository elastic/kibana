/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildQueryFilter, Filter } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import { maxBy, minBy } from 'lodash';
import { TimeRange } from '@kbn/data-plugin/common';
import { ExpressionValueFilter } from '../../types';
// @ts-expect-error untyped local
import { buildBoolArray } from './build_bool_array';

export interface EmbeddableFilterInput {
  filters: Filter[];
  timeRange?: TimeRange;
}

type ESFilter = Record<string, any>;

const TimeFilterType = 'time';

const formatTime = (str: string | undefined, roundUp: boolean = false) => {
  if (!str) {
    return null;
  }
  const moment = dateMath.parse(str, { roundUp });
  return !moment || !moment.isValid() ? null : moment.valueOf();
};

function getTimeRangeFromFilters(filters: ExpressionValueFilter[]): TimeRange | undefined {
  const timeFilters = filters.filter(
    (filter) =>
      filter.filterType !== undefined &&
      filter.filterType === TimeFilterType &&
      filter.from !== undefined &&
      filter.to !== undefined
  );

  const validatedTimeFilters = timeFilters.filter(
    (filter) => formatTime(filter.from) !== null && formatTime(filter.to, true) !== null
  );

  const minFromFilter = minBy(validatedTimeFilters, (filter) => formatTime(filter.from));
  const maxToFilter = maxBy(validatedTimeFilters, (filter) => formatTime(filter.to, true));

  return minFromFilter?.from && maxToFilter?.to
    ? { from: minFromFilter.from, to: maxToFilter.to }
    : undefined;
}

export function getQueryFilters(filters: ExpressionValueFilter[]): Filter[] {
  const dataFilters = filters.map((filter) => ({ ...filter, type: filter.filterType }));
  return buildBoolArray(dataFilters).map((filter: ESFilter, index: number) => {
    const { group, ...restFilter } = filter;
    return buildQueryFilter(restFilter, index.toString(), '', { group });
  });
}

export function buildEmbeddableFilters(filters: ExpressionValueFilter[]): EmbeddableFilterInput {
  return {
    timeRange: getTimeRangeFromFilters(filters),
    filters: getQueryFilters(filters),
  };
}
