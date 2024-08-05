/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import createContainer from 'constate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildEsQuery, Filter, fromKueryExpression, TimeRange, type Query } from '@kbn/es-query';
import { Subscription, map, tap } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { useSearchSessionContext } from '../../../../hooks/use_search_session';
import { parseDateRange } from '../../../../utils/datemath';
import { useKibanaQuerySettings } from '../../../../hooks/use_kibana_query_settings';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { telemetryTimeRangeFormatter } from '../../../../../common/formatters/telemetry_time_range';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import {
  useHostsUrlState,
  type HostsState,
  type StringDateRangeTimestamp,
  StringDateRange,
} from './use_unified_search_url_state';
import { retrieveFieldsFromFilter } from '../../../../utils/filters/build';

const buildQuerySubmittedPayload = (
  hostState: HostsState & { parsedDateRange: StringDateRangeTimestamp }
) => {
  const { panelFilters, filters, parsedDateRange, query: queryObj, limit } = hostState;

  return {
    control_filter_fields: retrieveFieldsFromFilter(panelFilters),
    filter_fields: retrieveFieldsFromFilter(filters),
    interval: telemetryTimeRangeFormatter(parsedDateRange.to - parsedDateRange.from),
    with_query: !!queryObj.query,
    limit,
  };
};

const DEFAULT_FROM_IN_MILLISECONDS = 15 * 60000;

const getDefaultTimestamps = () => {
  const now = Date.now();

  return {
    from: new Date(now - DEFAULT_FROM_IN_MILLISECONDS).toISOString(),
    to: new Date(now).toISOString(),
  };
};

export const useUnifiedSearch = () => {
  const [error, setError] = useState<Error | null>(null);
  const [searchCriteria, setSearch] = useHostsUrlState();
  const { metricsView } = useMetricsDataViewContext();
  const { updateSearchSessionId } = useSearchSessionContext();
  const { services } = useKibanaContextForPlugin();
  const kibanaQuerySettings = useKibanaQuerySettings();

  const {
    data: {
      query: { filterManager: filterManagerService, queryString: queryStringService },
    },
    telemetry,
  } = services;

  const validateQuery = useCallback(
    (query: Query) => {
      fromKueryExpression(query.query, kibanaQuerySettings);
    },
    [kibanaQuerySettings]
  );

  const onFiltersChange = useCallback(
    (filters: Filter[]) => {
      setSearch({ type: 'SET_FILTERS', filters });
    },
    [setSearch]
  );

  const onPanelFiltersChange = useCallback(
    (panelFilters: Filter[]) => {
      setSearch({ type: 'SET_PANEL_FILTERS', panelFilters });
    },
    [setSearch]
  );

  const onLimitChange = useCallback(
    (limit: number) => {
      setSearch({ type: 'SET_LIMIT', limit });
    },
    [setSearch]
  );

  const onDateRangeChange = useCallback(
    (dateRange: StringDateRange) => {
      setSearch({ type: 'SET_DATE_RANGE', dateRange });
    },
    [setSearch]
  );

  const onQueryChange = useCallback(
    (query: Query) => {
      try {
        setError(null);
        validateQuery(query);
        setSearch({ type: 'SET_QUERY', query });
      } catch (err) {
        setError(err);
      }
    },
    [validateQuery, setSearch]
  );

  const onSubmit = useCallback(
    ({ dateRange }: { dateRange: TimeRange }) => {
      onDateRangeChange(dateRange);
      updateSearchSessionId();
    },
    [onDateRangeChange, updateSearchSessionId]
  );

  const parsedDateRange = useMemo(() => {
    const defaults = getDefaultTimestamps();

    const { from = defaults.from, to = defaults.to } = parseDateRange(searchCriteria.dateRange);

    return { from, to };
  }, [searchCriteria.dateRange]);

  const getDateRangeAsTimestamp = useCallback(() => {
    const from = new Date(parsedDateRange.from).getTime();
    const to = new Date(parsedDateRange.to).getTime();

    return { from, to };
  }, [parsedDateRange]);

  const buildQuery = useCallback(() => {
    return buildEsQuery(
      metricsView?.dataViewReference,
      searchCriteria.query,
      [...searchCriteria.filters, ...searchCriteria.panelFilters],
      kibanaQuerySettings
    );
  }, [
    metricsView?.dataViewReference,
    searchCriteria.query,
    searchCriteria.filters,
    searchCriteria.panelFilters,
    kibanaQuerySettings,
  ]);

  useEffectOnce(() => {
    // Sync filtersService from the URL state
    if (!deepEqual(filterManagerService.getFilters(), searchCriteria.filters)) {
      filterManagerService.setFilters(searchCriteria.filters);
    }
    // Sync queryService from the URL state
    if (!deepEqual(queryStringService.getQuery(), searchCriteria.query)) {
      queryStringService.setQuery(searchCriteria.query);
    }

    try {
      // Validates the "query" object from the URL state
      if (searchCriteria.query) {
        validateQuery(searchCriteria.query);
      }
    } catch (err) {
      setError(err);
    }
  });

  useEffect(() => {
    const subscription = new Subscription();
    subscription.add(
      filterManagerService
        .getUpdates$()
        .pipe(
          map(() => filterManagerService.getFilters()),
          tap((filters) => onFiltersChange(filters))
        )
        .subscribe()
    );

    subscription.add(
      queryStringService
        .getUpdates$()
        .pipe(
          map(() => queryStringService.getQuery() as Query),
          tap((query) => onQueryChange(query))
        )
        .subscribe()
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [filterManagerService, queryStringService, onQueryChange, onFiltersChange]);

  // Track telemetry event on query/filter/date changes
  useEffect(() => {
    const dateRangeInTimestamp = getDateRangeAsTimestamp();
    telemetry.reportHostsViewQuerySubmitted(
      buildQuerySubmittedPayload({ ...searchCriteria, parsedDateRange: dateRangeInTimestamp })
    );
  }, [getDateRangeAsTimestamp, searchCriteria, telemetry]);

  return {
    error,
    buildQuery,
    onSubmit,
    parsedDateRange,
    getDateRangeAsTimestamp,
    searchCriteria,
    onDateRangeChange,
    onLimitChange,
    onPanelFiltersChange,
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
