/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, createContext, useEffect, useState, useContext } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { type AggregateQuery } from '@kbn/es-query';
import { useAiopsAppContext } from './use_aiops_app_context';

export const FilterQueryContext = createContext<{
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
}>({
  get filters(): Filter[] {
    throw new Error('FilterQueryContext is not initialized');
  },
  get query(): Query {
    throw new Error('FilterQueryContext is not initialized');
  },
  get timeRange(): TimeRange {
    throw new Error('FilterQueryContext is not initialized');
  },
});

/**
 * Helper context to provide the latest filter, query and time range values
 * from the data plugin.
 * Also merges custom filters and queries provided with an input.
 *
 * @param children
 * @constructor
 */
export const FilterQueryContextProvider: FC<{ timeRange?: TimeRange }> = ({
  children,
  timeRange,
}) => {
  const {
    data: {
      query: { filterManager, queryString },
    },
  } = useAiopsAppContext();

  const [resultFilters, setResultFilter] = useState<Filter[]>(filterManager.getFilters());
  const [resultQuery, setResultQuery] = useState<Query | AggregateQuery>(queryString.getQuery());

  const timeRangeUpdates = useTimeRangeUpdates(false);

  useEffect(() => {
    const sub = filterManager.getUpdates$().subscribe(() => {
      setResultFilter(filterManager.getFilters());
    });
    return () => {
      sub.unsubscribe();
    };
  }, [filterManager]);

  useEffect(() => {
    const sub = queryString.getUpdates$().subscribe(() => {
      setResultQuery(queryString.getQuery());
    });
    return () => {
      sub.unsubscribe();
    };
  }, [queryString]);

  return (
    <FilterQueryContext.Provider
      value={{
        filters: resultFilters,
        query: resultQuery as Query,
        timeRange: timeRange ?? timeRangeUpdates,
      }}
    >
      {children}
    </FilterQueryContext.Provider>
  );
};

export const useFilerQueryUpdates = () => {
  return useContext(FilterQueryContext);
};
