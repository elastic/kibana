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
  HostsSearchPayload,
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

const getDefaultTimestamps = () => {
  const now = Date.now();

  return {
    from: now - DEFAULT_FROM_IN_MILLISECONDS,
    to: now,
  };
};

export const useUnifiedSearch = () => {
  const [searchCriteria, setSearch] = useHostsUrlState();
  const { dataView } = useMetricsDataViewContext();
  const { services } = useKibanaContextForPlugin();
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

  const onSubmit = (params?: HostsSearchPayload) => setSearch(params ?? {});

  const getDateRangeAsTimestamp = useCallback(() => {
    const defaults = getDefaultTimestamps();

    const from = DateMath.parse(searchCriteria.dateRange.from)?.valueOf() ?? defaults.from;
    const to =
      DateMath.parse(searchCriteria.dateRange.to, { roundUp: true })?.valueOf() ?? defaults.to;

    return { from, to };
  }, [searchCriteria.dateRange]);

  const buildQuery = useCallback(() => {
    return buildEsQuery(dataView, searchCriteria.query, [
      ...searchCriteria.filters,
      ...searchCriteria.panelFilters,
    ]);
  }, [dataView, searchCriteria.query, searchCriteria.filters, searchCriteria.panelFilters]);

  useEffectOnce(() => {
    // Sync filtersService from state
    if (!deepEqual(filterManagerService.getFilters(), searchCriteria.filters)) {
      filterManagerService.setFilters(searchCriteria.filters);
    }
    // Sync queryService from state
    if (!deepEqual(queryStringService.getQuery(), searchCriteria.query)) {
      queryStringService.setQuery(searchCriteria.query);
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
      .subscribe(setSearch);

    return () => {
      subscription.unsubscribe();
    };
  }, [filterManagerService, setSearch, queryStringService, timeFilterService.timefilter]);

  // Track telemetry event on query/filter/date changes
  useEffect(() => {
    const dateRangeTimestamp = getDateRangeAsTimestamp();
    telemetry.reportHostsViewQuerySubmitted(
      buildQuerySubmittedPayload({ ...searchCriteria, dateRangeTimestamp })
    );
  }, [getDateRangeAsTimestamp, searchCriteria, telemetry]);

  return {
    buildQuery,
    onSubmit,
    getDateRangeAsTimestamp,
    searchCriteria,
  };
};

export const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
