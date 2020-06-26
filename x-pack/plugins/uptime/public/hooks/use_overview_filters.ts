/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { overviewFiltersSelector, esKuerySelector, uiSelector } from '../state/selectors';
import { UptimeRefreshContext } from '../contexts';
import { parseFiltersMap } from '../components/overview/filter_group/parse_filter_map';
import { fetchOverviewFilters } from '../state/actions';

export const useOverviewFilters = () => {
  const overviewFilters = useSelector(overviewFiltersSelector);
  const esKuery = useSelector(esKuerySelector);
  const {
    dateRange: { from, to },
    selectedFilters,
    statusFilter,
  } = useSelector(uiSelector);
  const { lastRefresh } = useContext(UptimeRefreshContext);
  const dispatch = useDispatch();
  useEffect(() => {
    const filterSelections = parseFiltersMap(selectedFilters);
    const locations = filterSelections['observer.geo.name'] ?? [];
    const ports = filterSelections['url.port'] ?? [];
    const schemes = filterSelections['monitor.type'] ?? [];
    const tags = filterSelections.tags ?? [];
    dispatch(
      fetchOverviewFilters({
        dateRangeStart: from,
        dateRangeEnd: to,
        locations,
        ports,
        schemes,
        tags,
        search: esKuery,
        statusFilter,
      })
    );
  }, [dispatch, esKuery, from, to, lastRefresh, selectedFilters, statusFilter]);

  return overviewFilters;
};
