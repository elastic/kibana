/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';
import type { FilterManager, SavedQuery } from '@kbn/data-plugin/public';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  DEFAULT_QUERY,
  DEFAULT_TIME_RANGE,
  encodeState,
  FILTERS_QUERYSTRING_NAMESPACE,
  stateFromQueryParams,
} from './utils';

export interface UseFiltersValue {
  timeRange?: TimeRange;
  filters: Filter[];
  filterQuery: Query;
  handleSavedQuery: (savedQuery: SavedQuery | undefined) => void;
  handleSubmitTimeRange: (timeRange?: TimeRange) => void;
  handleSubmitQuery: (filterQuery: Query) => void;
  filterManager: FilterManager;
  savedQuery?: SavedQuery;
}

/**
 * Custom react hook housing logic for KQL bar
 * @returns Filters and TimeRange for use with KQL bar
 */
export const useFilters = (): UseFiltersValue => {
  const { pathname: browserPathName, search } = useLocation();
  const history = useHistory();
  const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(undefined);

  const {
    services: {
      data: {
        query: { filterManager },
      },
    },
  } = useKibana();

  // Filters are picked using the UI widgets
  const [filters, setFilters] = useState<Filter[]>([]);

  // Time range is self explanatory
  const [timeRange, setTimeRange] = useState<TimeRange | undefined>(DEFAULT_TIME_RANGE);

  // filterQuery is raw kql query that user can type in to filter results
  const [filterQuery, setFilterQuery] = useState<Query>(DEFAULT_QUERY);

  // Serialize filters into query string
  useEffect(() => {
    const filterStateAsString = encodeState({ filters, filterQuery, timeRange });

    if (!deepEqual(filterManager.getFilters(), filters)) {
      filterManager.setFilters(filters);
    }

    history.replace({
      pathname: browserPathName,
      search: `${FILTERS_QUERYSTRING_NAMESPACE}=${filterStateAsString}`,
    });
  }, [browserPathName, filterManager, filterQuery, filters, history, timeRange]);

  // Sync filterManager to local state (after they are changed from the ui)
  useEffect(() => {
    const subscription = filterManager.getUpdates$().subscribe(() => {
      setFilters(filterManager.getFilters());
    });

    return () => subscription.unsubscribe();
  }, [filterManager]);

  // Update local state with filter values from the url (on initial mount)
  useEffect(() => {
    const {
      filters: filtersFromQuery,
      timeRange: timeRangeFromQuery,
      filterQuery: filterQueryFromQuery,
    } = stateFromQueryParams(search);

    setTimeRange(timeRangeFromQuery);
    setFilterQuery(filterQueryFromQuery);
    setFilters(filtersFromQuery);

    // We only want to have it done on initial render with initial 'search' value;
    // that is why 'search' is ommited from the deps array

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterManager]);

  const onSavedQuery = useCallback(
    (newSavedQuery: SavedQuery | undefined) => setSavedQuery(newSavedQuery),
    []
  );

  return {
    timeRange,
    filters,
    filterQuery,
    handleSavedQuery: onSavedQuery,
    handleSubmitTimeRange: setTimeRange,
    handleSubmitQuery: setFilterQuery,
    filterManager,
    savedQuery,
  };
};
