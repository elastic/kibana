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
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { InfraClientStartDeps } from '../../../../types';
import { useMetricsDataViewContext } from './use_data_view';
import { useSyncKibanaTimeFilterTime } from '../../../../hooks/use_kibana_timefilter_time';
import { useHostsUrlState, INITIAL_DATE_RANGE, HostsState } from './use_hosts_url_state';

const buildQuerySubmittedPayload = (hostState: HostsState) => {
  const { panelFilters, filters, dateRange, query: queryObj } = hostState;

  return {
    control_filters: panelFilters.map((filter) => JSON.stringify(filter)),
    filters: filters.map((filter) => JSON.stringify(filter)),
    interval: `interval(from:${dateRange.from},to:${dateRange.to})`,
    query: queryObj.query,
  };
};

export const useUnifiedSearch = () => {
  const { state, dispatch, getRangeInTimestamp, getTime } = useHostsUrlState();
  const { metricsDataView } = useMetricsDataViewContext();
  const { services } = useKibana<InfraClientStartDeps>();

  const {
    data: { query: queryManager },
    telemetry,
  } = services;

  useSyncKibanaTimeFilterTime(INITIAL_DATE_RANGE, {
    from: state.dateRange.from,
    to: state.dateRange.to,
  });

  const { filterManager } = queryManager;

  // Track telemetry event on query/filter/date changes
  useEffect(() => {
    telemetry.reportHostsViewQuerySubmitted(buildQuerySubmittedPayload(state));
  }, [state, telemetry]);

  const onSubmit = useCallback(
    (data?: {
      query?: Query;
      dateRange?: TimeRange;
      filters?: Filter[];
      panelFilters?: Filter[];
    }) => {
      const { query, dateRange, filters, panelFilters } = data ?? {};
      const newDateRange = dateRange ?? getTime();

      if (filters) {
        filterManager.setFilters(filters);
      }

      dispatch({
        type: 'setQuery',
        payload: {
          query,
          filters: filters ? filterManager.getFilters() : undefined,
          dateRange: newDateRange,
          dateRangeTimestamp: getRangeInTimestamp(newDateRange),
          panelFilters,
        },
      });
    },
    [getTime, dispatch, filterManager, getRangeInTimestamp]
  );

  // This won't prevent onSubmit from being fired twice when `clear filters` is clicked,
  // that happens because both onQuerySubmit and onFiltersUpdated are internally triggered on same event by SearchBar.
  // This just delays potential duplicate onSubmit calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceOnSubmit = useCallback(debounce(onSubmit, 100), [onSubmit]);

  const saveQuery = useCallback(
    (newSavedQuery: SavedQuery) => {
      const savedQueryFilters = newSavedQuery.attributes.filters ?? [];
      const globalFilters = filterManager.getGlobalFilters();

      const query = newSavedQuery.attributes.query;

      dispatch({
        type: 'setQuery',
        payload: {
          query,
          filters: [...savedQueryFilters, ...globalFilters],
        },
      });
    },
    [filterManager, dispatch]
  );

  const clearSavedQuery = useCallback(() => {
    dispatch({
      type: 'setFilter',
      payload: filterManager.getGlobalFilters(),
    });
  }, [filterManager, dispatch]);

  const buildQuery = useCallback(() => {
    if (!metricsDataView) {
      return null;
    }
    return buildEsQuery(metricsDataView, state.query, [
      ...state.filters,
      ...(state.panelFilters ?? []),
    ]);
  }, [metricsDataView, state.query, state.filters, state.panelFilters]);

  return {
    buildQuery,
    clearSavedQuery,
    controlPanelFilters: state.panelFilters,
    dateRangeTimestamp: state.dateRangeTimestamp,
    onSubmit: debounceOnSubmit,
    saveQuery,
    unifiedSearchQuery: state.query,
    unifiedSearchDateRange: getTime(),
    unifiedSearchFilters: state.filters,
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
