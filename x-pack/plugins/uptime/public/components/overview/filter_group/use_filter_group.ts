/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUrlParams } from '../../../hooks';
import { parseFiltersMap } from './parse_filter_map';
import { fetchOverviewFilters } from '../../../state/actions';
import { UptimeRefreshContext } from '../../../contexts';
import { esKuerySelector } from '../../../state/selectors';

interface Props {
  esKueryFilters?: string;
}

export const useFilterGroup = ({ esKueryFilters }: Props) => {
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const esKuery = useSelector(esKuerySelector);

  const { dateRangeStart, dateRangeEnd, statusFilter, filters: urlFilters } = useGetUrlParams();

  const dispatch = useDispatch();

  useEffect(() => {
    const filterSelections = parseFiltersMap(urlFilters);
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
    esKueryFilters,
    statusFilter,
    urlFilters,
    dispatch,
  ]);
};
