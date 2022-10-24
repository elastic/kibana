/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import createContainer from 'constate';
import { useCallback, useReducer } from 'react';
import { buildEsQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import DateMath from '@kbn/datemath';
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { InfraClientStartDeps } from '../../../../types';
import { useMetricsDataViewContext } from './use_data_view';
import { useKibanaTimefilterTime } from '../../../../hooks/use_kibana_timefilter_time';

const DEFAULT_FROM_MINUTES_VALUE = 15;

export const useUnifiedSearch = () => {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const { metricsDataView } = useMetricsDataViewContext();
  const { services } = useKibana<InfraClientStartDeps>();
  const {
    data: { query: queryManager },
  } = services;

  const [getTime, setTime] = useKibanaTimefilterTime({
    from: `now-${DEFAULT_FROM_MINUTES_VALUE}m`,
    to: 'now',
  });
  const { queryString, filterManager } = queryManager;

  const currentDate = new Date();
  const fromTS =
    DateMath.parse(getTime().from)?.valueOf() ??
    new Date(currentDate.getMinutes() - DEFAULT_FROM_MINUTES_VALUE).getTime();
  const toTS = DateMath.parse(getTime().to)?.valueOf() ?? currentDate.getTime();

  const currentTimeRange = {
    from: fromTS,
    to: toTS,
  };

  const submitFilterChange = useCallback(
    (query?: Query, dateRange?: TimeRange, filters?: Filter[]) => {
      if (filters) {
        filterManager.setFilters(filters);
      }

      setTime({
        ...getTime(),
        ...dateRange,
      });

      queryString.setQuery({ ...queryString.getQuery(), ...query });
      // Unified search holds the all state, we need to force the hook to rerender so that it can return the most recent values
      // This can be removed once we get the state from the URL
      forceUpdate();
    },
    [filterManager, queryString, getTime, setTime]
  );

  const saveQuery = useCallback(
    (newSavedQuery: SavedQuery) => {
      const savedQueryFilters = newSavedQuery.attributes.filters || [];
      const globalFilters = filterManager.getGlobalFilters();
      filterManager.setFilters([...savedQueryFilters, ...globalFilters]);

      // Unified search holds the all state, we need to force the hook to rerender so that it can return the most recent values
      // This can be removed once we get the state from the URL
      forceUpdate();
    },
    [filterManager]
  );

  const clearSavedQUery = useCallback(() => {
    filterManager.setFilters(filterManager.getGlobalFilters());

    // Unified search holds the all state, we need to force the hook to rerender so that it can return the most recent values
    // This can be removed once we get the state from the URL
    forceUpdate();
  }, [filterManager]);

  const buildQuery = useCallback(() => {
    if (!metricsDataView) {
      return null;
    }
    return buildEsQuery(metricsDataView, queryString.getQuery(), filterManager.getFilters());
  }, [filterManager, metricsDataView, queryString]);

  return {
    dateRangeTimestamp: currentTimeRange,
    esQuery: buildQuery(),
    submitFilterChange,
    saveQuery,
    clearSavedQUery,
    unifiedSearchQuery: queryString.getQuery() as Query,
    unifiedSearchDateRange: getTime(),
    unifiedSearchFilters: filterManager.getFilters(),
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
