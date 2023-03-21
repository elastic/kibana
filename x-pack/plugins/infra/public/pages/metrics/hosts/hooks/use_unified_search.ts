/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import createContainer from 'constate';
import { useCallback, useEffect } from 'react';
import { buildEsQuery, type Filter, type Query, type TimeRange } from '@kbn/es-query';
import { map, skip, startWith } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { telemetryTimeRangeFormatter } from '../../../../../common/formatters/telemetry_time_range';
import type { InfraClientStartDeps } from '../../../../types';
import { useMetricsDataViewContext } from './use_data_view';
import {
  useHostsUrlState,
  type HostsState,
  type StringDateRangeTimestamp,
} from './use_unified_search_url_state';

const buildQuerySubmittedPayload = (
  hostState: HostsState & { dateRangeTimestamp: StringDateRangeTimestamp }
) => {
  const { panelFilters, filters, dateRangeTimestamp, query: queryObj } = hostState;

  return {
    control_filters: panelFilters.map((filter) => JSON.stringify(filter)),
    filters: filters.map((filter) => JSON.stringify(filter)),
    interval: telemetryTimeRangeFormatter(dateRangeTimestamp.to - dateRangeTimestamp.from),
    query: queryObj.query,
  };
};

export const useUnifiedSearch = () => {
  const { state, dispatch, getTime, getDateRangeAsTimestamp } = useHostsUrlState();
  const { dataView } = useMetricsDataViewContext();
  const { services } = useKibana<InfraClientStartDeps>();
  const {
    data: {
      query: {
        filterManager: filterManagerService,
        timefilter: timeFilterService,
        queryString: queryStringService,
      },
    },
    telemetry,
  } = services;

  const onSubmit = useCallback(
    (data?: {
      query?: Query;
      dateRange?: TimeRange;
      filters?: Filter[];
      panelFilters?: Filter[];
    }) => {
      const {
        panelFilters,
        query,
        // Makes sure default values are set in case `onSubmit` is called outside the unified search observables subscription
        // and prevents their state values from being cleared.
        dateRange = getTime(),
        filters = filterManagerService.getFilters(),
      } = data ?? {};

      dispatch({
        type: 'setQuery',
        payload: {
          query,
          filters,
          dateRange,
          panelFilters,
        },
      });
    },
    [dispatch, filterManagerService, getTime]
  );

  const loadFiltersFromState = useCallback(() => {
    if (!deepEqual(filterManagerService.getFilters(), state.filters)) {
      filterManagerService.setFilters(state.filters);
    }
  }, [filterManagerService, state.filters]);

  const loadQueryFromState = useCallback(() => {
    if (!deepEqual(queryStringService.getQuery(), state.query)) {
      queryStringService.setQuery(state.query);
    }
  }, [queryStringService, state.query]);

  const loadDateRangeFromState = useCallback(() => {
    if (!deepEqual(timeFilterService.timefilter.getTime(), state.dateRange)) {
      timeFilterService.timefilter.setTime(state.dateRange);
    }
  }, [timeFilterService, state.dateRange]);

  useEffectOnce(() => {
    loadFiltersFromState();
    loadQueryFromState();
    loadDateRangeFromState();
  });

  useEffect(() => {
    const filters$ = filterManagerService.getUpdates$().pipe(
      startWith(undefined),
      map(() => filterManagerService.getFilters())
    );

    const query$ = queryStringService.getUpdates$().pipe(
      startWith(undefined),
      map(() => queryStringService.getQuery() as Query)
    );

    const dateRange$ = timeFilterService.timefilter.getTimeUpdate$().pipe(
      startWith(undefined),
      map(() => getTime())
    );

    const subscription = combineLatest({
      filters: filters$,
      query: query$,
      dateRange: dateRange$,
    })
      .pipe(skip(1))
      .subscribe(({ filters, query, dateRange }) => {
        onSubmit({
          query,
          filters,
          dateRange,
        });
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [filterManagerService, getTime, onSubmit, queryStringService, timeFilterService.timefilter]);

  // Track telemetry event on query/filter/date changes
  useEffect(() => {
    const dateRangeTimestamp = getDateRangeAsTimestamp();
    telemetry.reportHostsViewQuerySubmitted(
      buildQuerySubmittedPayload({ ...state, dateRangeTimestamp })
    );
  }, [getDateRangeAsTimestamp, state, telemetry]);

  const getAllFilters = useCallback(
    () => [...state.filters, ...state.panelFilters],
    [state.filters, state.panelFilters]
  );
  const buildQuery = useCallback(() => {
    return buildEsQuery(dataView, state.query, getAllFilters());
  }, [dataView, state.query, getAllFilters]);

  return {
    buildQuery,
    onSubmit,
    getDateRangeAsTimestamp,
    searchCriteria: { ...state },
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
