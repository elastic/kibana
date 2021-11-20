/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildQueryFilter, Filter } from '@kbn/es-query';
import { ExpressionValueFilter } from '../../types';
// @ts-expect-error untyped local
import { buildBoolArray } from './build_bool_array';
import { TimeRange } from '../../../../../src/plugins/data/common';

export interface EmbeddableFilterInput {
  filters: Filter[];
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

export function getQueryFilters(filters: ExpressionValueFilter[]): Filter[] {
  const dataFilters = filters.map((filter) => ({ ...filter, type: filter.filterType }));
  return buildBoolArray(dataFilters).map(buildQueryFilter);
}

export function buildEmbeddableFilters(filters: ExpressionValueFilter[]): EmbeddableFilterInput {
  return {
    timeRange: getTimeRangeFromFilters(filters),
    filters: getQueryFilters(filters),
  };
}
