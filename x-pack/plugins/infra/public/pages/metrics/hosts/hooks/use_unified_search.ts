/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import createContainer from 'constate';
import { useCallback, useEffect } from 'react';
import DateMath from '@kbn/datemath';
import { buildEsQuery, type Query } from '@kbn/es-query';
import { map, skip, startWith } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { telemetryTimeRangeFormatter } from '../../../../../common/formatters/telemetry_time_range';
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

const DEFAULT_FROM_IN_MILLISECONDS = 15 * 60000;

const getDefaultFromTimestamp = () => Date.now() - DEFAULT_FROM_IN_MILLISECONDS;
const getDefaultToTimestamp = () => Date.now();

export const useUnifiedSearch = () => {
  const [state, setState] = useHostsUrlState();
  const { dataView } = useMetricsDataViewContext();
  const { services } = useKibanaContextForPlugin();
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

  const onSubmit = setState;

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

  useEffectOnce(() => {
    loadFiltersFromState();
    loadQueryFromState();
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

    const subscription = combineLatest({
      filters: filters$,
      query: query$,
    })
      .pipe(skip(1))
      .subscribe(({ filters, query }) => {
        setState({
          query,
          filters,
        });
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [filterManagerService, setState, queryStringService, timeFilterService.timefilter]);

  const getDateRangeAsTimestamp = useCallback(() => {
    const from = DateMath.parse(state.dateRange.from)?.valueOf() ?? getDefaultFromTimestamp();
    const to =
      DateMath.parse(state.dateRange.to, { roundUp: true })?.valueOf() ?? getDefaultToTimestamp();

    return { from, to };
  }, [state.dateRange]);

  // Track telemetry event on query/filter/date changes
  useEffect(() => {
    const dateRangeTimestamp = getDateRangeAsTimestamp();
    telemetry.reportHostsViewQuerySubmitted(
      buildQuerySubmittedPayload({ ...state, dateRangeTimestamp })
    );
  }, [getDateRangeAsTimestamp, state, telemetry]);

  const buildQuery = useCallback(() => {
    return buildEsQuery(dataView, state.query, [...state.filters, ...state.panelFilters]);
  }, [dataView, state.query, state.filters, state.panelFilters]);

  return {
    buildQuery,
    onSubmit,
    getDateRangeAsTimestamp,
    searchCriteria: state,
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
