/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { InfraClientStartDeps } from '../../../../types';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';

interface Props {
  dataView: DataView;
}

export const FilterBar = ({ dataView }: Props) => {
  const {
    services: { unifiedSearch },
  } = useKibana<InfraClientStartDeps>();
  const { unifiedSearchDateRange, unifiedSearchQuery, submitFilterChange, saveQuery } =
    useUnifiedSearchContext();

  const { AggregateQuerySearchBar } = unifiedSearch.ui;

  const onFilterChange = (filters: Filter[]) => {
    onQueryChange({ filters });
  };

  const onQuerySubmit = (payload: { dateRange: TimeRange; query?: Query }) => {
    onQueryChange({ payload });
  };

  const onQuerySave = (savedQuery: SavedQuery) => {
    saveQuery(savedQuery);
  };

  const onQueryChange = ({
    payload,
    filters,
  }: {
    payload?: { dateRange: TimeRange; query?: Query };
    filters?: Filter[];
  }) => {
    submitFilterChange(payload?.query, payload?.dateRange, filters);
  };

  return (
    <AggregateQuerySearchBar<Query>
      appName={'infra'}
      data-test-subj="infraApp_searchBar"
      screenTitle={'infra'}
      showFilterBar={true}
      showSaveQuery={true}
      showDatePicker={true}
      query={unifiedSearchQuery}
      dateRangeFrom={unifiedSearchDateRange.from}
      dateRangeTo={unifiedSearchDateRange.to}
      indexPatterns={[dataView]}
      indicateNoData={true}
      onQuerySubmit={onQuerySubmit}
      onSaved={onQuerySave}
      onSavedQueryUpdated={onQuerySave}
      // @ts-expect-error onFiltersUpdated is a valid prop on SearchBar
      onFiltersUpdated={onFilterChange}
      showSearchBar={true}
    />
  );
};
