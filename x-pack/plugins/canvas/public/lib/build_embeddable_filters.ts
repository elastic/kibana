/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionValueFilter } from '../../types';
// @ts-expect-error untyped local
import { buildBoolArray } from './build_bool_array';
import { TimeRange, esFilters, Filter as DataFilter } from '../../../../../src/plugins/data/public';

export interface EmbeddableFilterInput {
  filters: DataFilter[];
  timeRange?: TimeRange;
}

const TimeFilterType = 'time';

function getTimeRangeFromFilters(filters: ExpressionValueFilter[]): TimeRange | undefined {
  const timeFilter = filters.find(
    (filter) => filter.filterType !== undefined && filter.filterType === TimeFilterType
  );

  return timeFilter !== undefined && timeFilter.from !== undefined && timeFilter.to !== undefined
    ? {
        from: timeFilter.from,
        to: timeFilter.to,
      }
    : undefined;
}

export function getQueryFilters(filters: ExpressionValueFilter[]): DataFilter[] {
  const dataFilters = filters.map((filter) => ({ ...filter, type: filter.filterType }));
  return buildBoolArray(dataFilters).map(esFilters.buildQueryFilter);
}

export function buildEmbeddableFilters(filters: ExpressionValueFilter[]): EmbeddableFilterInput {
  return {
    timeRange: getTimeRangeFromFilters(filters),
    filters: getQueryFilters(filters),
  };
}
