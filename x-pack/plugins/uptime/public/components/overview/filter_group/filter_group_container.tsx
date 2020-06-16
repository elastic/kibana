/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { parseFiltersMap } from './parse_filter_map';
import { fetchOverviewFilters } from '../../../state/actions';
import { FilterGroupComponent } from './index';
import { UptimeRefreshContext } from '../../../contexts';
import { esKuerySelector, overviewFiltersSelector, uiSelector } from '../../../state/selectors';

interface Props {
  esFilters?: string;
}

export const FilterGroup: React.FC<Props> = ({ esFilters }: Props) => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { filters: overviewFilters, loading } = useSelector(overviewFiltersSelector);
  const {
    dateRange: { from: dateRangeStart, to: dateRangeEnd },
    selectedFilters,
    statusFilter,
  } = useSelector(uiSelector);
  const esKuery = useSelector(esKuerySelector);
  const dispatch = useDispatch();

  useEffect(() => {
    const filterSelections = parseFiltersMap(selectedFilters);
    dispatch(
      fetchOverviewFilters({
        dateRangeStart,
        dateRangeEnd,
        locations: filterSelections.locations ?? [],
        ports: filterSelections.ports ?? [],
        schemes: filterSelections.schemes ?? [],
        search: esKuery,
        statusFilter,
        tags: filterSelections.tags ?? [],
      })
    );
  }, [
    lastRefresh,
    dateRangeStart,
    dateRangeEnd,
    esKuery,
    esFilters,
    selectedFilters,
    statusFilter,
    dispatch,
  ]);

  return <FilterGroupComponent overviewFilters={overviewFilters} loading={loading} />;
};
