/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import createContainer from 'constate';
import { useCallback } from 'react';
import { buildEsQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import DateMath from '@kbn/datemath';
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { InfraClientStartDeps } from '../../../../types';
import { useMetricsDataViewContext } from './use_data_view';
import { useTimeRangeUrlState } from './use_time_range_url_state';
import { useHostsQuery } from './use_host_query';
import { useHostFilters } from './use_host_filters';

const DEFAULT_FROM_MINUTES_VALUE = 15;

export const useUnifiedSearch = () => {
  const { metricsDataView } = useMetricsDataViewContext();
  const { services } = useKibana<InfraClientStartDeps>();
  const {
    data: { query: queryManager },
  } = services;

  const { setTimeRange: setSelectedTimeRange, getTime, setTime } = useTimeRangeUrlState();

  const { setFilterQuery, filterQuery } = useHostsQuery();
  const { setFilters, filters: urlFilters } = useHostFilters();

  const { queryString, filterManager } = queryManager;

  queryString.setQuery({
    ...queryString.getQuery(),
    query: filterQuery.expression,
    language: filterQuery.language,
  });

  filterManager.setFilters(urlFilters);

  const currentDate = new Date();
  const fromTS =
    DateMath.parse(getTime().from)?.valueOf() ??
    new Date(currentDate.getMinutes() - DEFAULT_FROM_MINUTES_VALUE).getTime();
  const toTS = DateMath.parse(getTime().to)?.valueOf() ?? currentDate.getTime();

  const currentTimeRange = {
    from: fromTS,
    to: toTS,
  };

  const queryToString = (query?: Query) =>
    typeof query?.query !== 'string' ? JSON.stringify(query?.query) : query?.query;

  const handleSelectedTimeRangeChange = useCallback(
    (selectedTime: { startTime: string; endTime: string; isInvalid: boolean }) => {
      if (selectedTime.isInvalid) {
        return;
      }
      setSelectedTimeRange(selectedTime);
    },
    [setSelectedTimeRange]
  );

  const submitFilterChange = useCallback(
    (query?: Query, dateRange?: TimeRange, filters?: Filter[]) => {
      if (filters) {
        filterManager.setFilters(filters);
        setFilters(filterManager.getFilters());
      }

      if (dateRange) {
        handleSelectedTimeRangeChange({
          startTime: dateRange.from,
          endTime: dateRange.to,
          isInvalid: false,
        });
        setTime({
          ...getTime(),
          ...dateRange,
        });
      }

      if (query) {
        setFilterQuery({
          language: query.language,
          expression: queryToString(query),
        });
      }

      queryString.setQuery({ ...queryString.getQuery(), ...query });
    },
    [
      setTime,
      getTime,
      queryString,
      setFilters,
      filterManager,
      handleSelectedTimeRangeChange,
      setFilterQuery,
    ]
  );

  const saveQuery = useCallback(
    (newSavedQuery: SavedQuery) => {
      const savedQueryFilters = newSavedQuery.attributes.filters ?? [];
      const globalFilters = filterManager.getGlobalFilters();
      filterManager.setFilters([...savedQueryFilters, ...globalFilters]);
      setFilters(filterManager.getFilters());
      const savedQuery = newSavedQuery.attributes.query;
      if (savedQuery) {
        setFilterQuery({
          language: savedQuery.language,
          expression: queryToString(savedQuery),
        });
      }
    },
    [setFilterQuery, setFilters, filterManager]
  );

  const clearSavedQUery = useCallback(() => {
    filterManager.setFilters(filterManager.getGlobalFilters());
    setFilters(filterManager.getFilters());
  }, [setFilters, filterManager]);

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
