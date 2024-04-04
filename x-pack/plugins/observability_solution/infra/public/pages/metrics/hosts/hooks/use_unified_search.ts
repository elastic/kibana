/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import createContainer from 'constate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildEsQuery, fromKueryExpression, type Query } from '@kbn/es-query';
import { map, skip, startWith } from 'rxjs';
import { combineLatest } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { parseDateRange } from '../../../../utils/datemath';
import { useKibanaQuerySettings } from '../../../../utils/use_kibana_query_settings';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { telemetryTimeRangeFormatter } from '../../../../../common/formatters/telemetry_time_range';
import { useMetricsDataViewContext } from './use_metrics_data_view';
import {
  HostsSearchPayload,
  useHostsUrlState,
  type HostsState,
  type StringDateRangeTimestamp,
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
  const { dataView } = useMetricsDataViewContext();
  const { services } = useKibanaContextForPlugin();
  const kibanaQuerySettings = useKibanaQuerySettings();

  const {
    data: {
      query: {
        filterManager: filterManagerService,
        queryString: queryStringService,
        timefilter: timeFilterService,
      },
    },
    telemetry,
  } = services;

  const validateQuery = useCallback(
    (query: Query) => {
      fromKueryExpression(query.query, kibanaQuerySettings);
    },
    [kibanaQuerySettings]
  );

  const onSubmit = useCallback(
    (params?: HostsSearchPayload) => {
      try {
        setError(null);
        /*
        / Validates the Search Bar input values before persisting them in the state.
        / Since the search can be triggered by components that are unaware of the Unified Search state (e.g Controls and Host Limit),
        / this will always validates the query bar value, regardless of whether it's been sent in the current event or not.
        */
        validateQuery(params?.query ?? (queryStringService.getQuery() as Query));
        setSearch(params ?? {});
      } catch (err) {
        /*
        / Persists in the state the params so they can be used in case the query bar is fixed by the user.
        / This is needed because the Unified Search observables are unnaware of the other componets in the search bar.
        / Invalid query isn't persisted because it breaks the Control component
        */
        const { query, ...validParams } = params ?? {};
        setSearch(validParams ?? {});
        setError(err);
      }
    },
    [queryStringService, setSearch, validateQuery]
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
      dataView,
      searchCriteria.query,
      [...searchCriteria.filters, ...searchCriteria.panelFilters],
      kibanaQuerySettings
    );
  }, [
    dataView,
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
      .subscribe(onSubmit);

    return () => {
      subscription.unsubscribe();
    };
  }, [filterManagerService, onSubmit, queryStringService, timeFilterService.timefilter]);

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
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
