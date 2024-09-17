/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart, FilterManager } from '@kbn/data-plugin/public';
import { AggregateQuery, Filter, isOfAggregateQueryType, Query, TimeRange } from '@kbn/es-query';
import { NonNullable } from '../helper';
import { LensRuntimeState } from '../types';

export interface MergedSearchContext {
  now: number;
  timeRange: TimeRange | undefined;
  query: Query[];
  filters: Filter[];
  disableWarningToasts: boolean;
}

export function getMergedSearchContext(
  state: LensRuntimeState,
  {
    filters,
    query,
    timeRange,
    timeslice,
  }: {
    filters?: Filter[];
    query?: Query | AggregateQuery;
    timeRange?: TimeRange;
    timeslice?: [number, number];
  },
  {
    data,
    injectFilterReferences,
  }: { data: DataPublicPluginStart; injectFilterReferences: FilterManager['inject'] }
): MergedSearchContext {
  const context = {
    now: data.nowProvider.get().getTime(),
    timeRange:
      timeslice != null
        ? {
            from: new Date(timeslice[0]).toISOString(),
            to: new Date(timeslice[1]).toISOString(),
            mode: 'absolute' as const,
          }
        : timeRange,
    query: isOfAggregateQueryType(state.query) ? [] : [state.query].filter(NonNullable),
    filters: injectFilterReferences(state.filters || [], state.attributes.references),
    disableWarningToasts: true,
  };
  // Prepend query and filters from dashboard to the visualization ones
  if (query) {
    if (!isOfAggregateQueryType(query)) {
      context.query.unshift(query);
    }
  }
  if (filters) {
    context.filters.unshift(...filters.filter(({ meta }) => !meta.disabled));
  }
  return context;
}
