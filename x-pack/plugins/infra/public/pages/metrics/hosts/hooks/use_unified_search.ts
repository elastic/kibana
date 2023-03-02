/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import createContainer from 'constate';
import { useCallback, useEffect } from 'react';
import { buildEsQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { debounce } from 'lodash';
import { map } from 'rxjs/operators';
import deepEqual from 'fast-deep-equal';
import { useKibanaQuerySettings } from '../../../../utils/use_kibana_query_settings';
import { telemetryTimeRangeFormatter } from '../../../../../common/formatters/telemetry_time_range';
import type { InfraClientStartDeps } from '../../../../types';
import { useMetricsDataViewContext } from './use_data_view';
import { useSyncKibanaTimeFilterTime } from '../../../../hooks/use_kibana_timefilter_time';
import {
  useHostsUrlState,
  INITIAL_DATE_RANGE,
  HostsState,
  StringDateRangeTimestamp,
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
  const kibanaQuerySettings = useKibanaQuerySettings();
  const { state, dispatch, getTime, getDateRangeAsTimestamp } = useHostsUrlState();
  const { metricsDataView } = useMetricsDataViewContext();
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

  useSyncKibanaTimeFilterTime(INITIAL_DATE_RANGE, {
    from: state.dateRange.from,
    to: state.dateRange.to,
  });

  const onSubmit = useCallback(
    (data?: {
      query?: Query;
      dateRange?: TimeRange;
      filters?: Filter[];
      panelFilters?: Filter[];
    }) => {
      const { query, dateRange, filters, panelFilters } = data ?? {};
      const newDateRange = dateRange ?? getTime();

      dispatch({
        type: 'setQuery',
        payload: {
          query,
          filters,
          dateRange: newDateRange,
          panelFilters,
        },
      });
    },
    [getTime, dispatch]
  );

  // This won't prevent onSubmit from being fired twice when `clear filters` is clicked,
  // that happens because both onQuerySubmit and onFiltersUpdated are internally triggered on same event by SearchBar.
  // This just delays potential duplicate onSubmit calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceOnSubmit = useCallback(debounce(onSubmit, 100), [onSubmit]);

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

  useEffect(() => {
    loadFiltersFromState();
    loadQueryFromState();
    loadDateRangeFromState();
  }, [loadDateRangeFromState, loadFiltersFromState, loadQueryFromState]);

  useEffect(() => {
    const filterSubscription = filterManagerService
      .getUpdates$()
      .pipe(
        map(() => filterManagerService.getFilters()),
        map((filters) =>
          onSubmit({
            filters,
          })
        )
      )
      .subscribe();

    return () => {
      filterSubscription.unsubscribe();
    };
  }, [onSubmit, filterManagerService]);

  useEffect(() => {
    const timeSubscription = timeFilterService.timefilter
      .getTimeUpdate$()
      .pipe(
        map(() => getTime()),
        map((dateRange) =>
          onSubmit({
            dateRange,
          })
        )
      )
      .subscribe();
    return () => {
      timeSubscription.unsubscribe();
    };
  }, [onSubmit, timeFilterService, getTime]);

  useEffect(() => {
    const querySubscription = queryStringService
      .getUpdates$()
      .pipe(
        map(() => queryStringService.getQuery() as Query),
        map((query) => {
          onSubmit({
            query,
          });
        })
      )
      .subscribe();
    return () => {
      querySubscription.unsubscribe();
    };
  }, [onSubmit, queryStringService]);

  // Track telemetry event on query/filter/date changes
  useEffect(() => {
    const dateRangeTimestamp = getDateRangeAsTimestamp();
    telemetry.reportHostsViewQuerySubmitted(
      buildQuerySubmittedPayload({ ...state, dateRangeTimestamp })
    );
  }, [getDateRangeAsTimestamp, state, telemetry]);

  const buildQuery = useCallback(() => {
    if (!metricsDataView) {
      return null;
    }
    return buildEsQuery(
      metricsDataView,
      queryStringService.getQuery(),
      [...filterManagerService.getFilters(), ...(state.panelFilters ?? [])],
      kibanaQuerySettings
    );
  }, [
    metricsDataView,
    queryStringService,
    kibanaQuerySettings,
    filterManagerService,
    state.panelFilters,
  ]);

  return {
    buildQuery,
    controlPanelFilters: state.panelFilters,
    onSubmit: debounceOnSubmit,
    getDateRangeAsTimestamp,
    unifiedSearchQuery: queryStringService.getQuery() as Query,
    unifiedSearchDateRange: getTime(),
    unifiedSearchFilters: filterManagerService.getFilters(),
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
