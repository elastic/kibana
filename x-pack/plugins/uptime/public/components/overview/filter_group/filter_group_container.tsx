/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useGetUrlParams } from '../../../hooks';
import { parseFiltersMap } from './parse_filter_map';
import { fetchOverviewFilters } from '../../../state/actions';
import { FilterGroupComponent } from './index';
import { UptimeRefreshContext } from '../../../contexts';
import { esKuerySelector, overviewFiltersSelector } from '../../../state/selectors';
import { MAPPING_ERROR_ROUTE } from '../../../../common/constants/ui';

interface Props {
  esFilters?: string;
}

export function shouldRedirectToMappingErrorPage(errors: Error[]) {
  return (
    errors.filter(
      (e) =>
        /**
         * These are elements of the Elasticsearch error we are trying to catch.
         */
        e.message.indexOf('search_phase_execution_exception') !== -1 ||
        e.message.indexOf('Please use a keyword field instead.') ||
        e.message.indexOf('set fielddata=true')
    ).length > 0
  );
}

export const FilterGroup: React.FC<Props> = ({ esFilters }: Props) => {
  const history = useHistory();
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { filters: overviewFilters, loading, errors } = useSelector(overviewFiltersSelector);

  /**
   * Because this component renders on the Overview Page, and this component typically fetches
   * its data fastest, there is a check whether the Heartbeat mappings are correctly installed.
   *
   * If the mappings are missing, we re-direct to a page with instructions on how to resolve
   * the missing mappings issue.
   */
  if (errors.length > 0 && shouldRedirectToMappingErrorPage(errors)) {
    history.push(MAPPING_ERROR_ROUTE);
  }

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
    esFilters,
    statusFilter,
    urlFilters,
    dispatch,
  ]);

  return <FilterGroupComponent overviewFilters={overviewFilters} loading={loading} />;
};
