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

export const UnifiedSearchBar = ({ dataView }: Props) => {
  const {
    services: { unifiedSearch },
  } = useKibana<InfraClientStartDeps>();
  const {
    unifiedSearchDateRange,
    unifiedSearchQuery,
    unifiedSearchFilters,
    onSubmit,
    saveQuery,
    clearSavedQuery,
  } = useUnifiedSearchContext();

  const { SearchBar } = unifiedSearch.ui;

  const onFilterChange = (filters: Filter[]) => {
    onQueryChange({ filters });
  };

  const onQuerySubmit = (payload: { dateRange: TimeRange; query?: Query }) => {
    onQueryChange({ payload });
  };

  const onClearSavedQuery = () => {
    clearSavedQuery();
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
    onSubmit(payload?.query, payload?.dateRange, filters);
  };

  return (
    <SearchBar
      appName={'Infra Hosts'}
      indexPatterns={[dataView]}
      query={unifiedSearchQuery}
      dateRangeFrom={unifiedSearchDateRange.from}
      dateRangeTo={unifiedSearchDateRange.to}
      filters={unifiedSearchFilters}
      onQuerySubmit={onQuerySubmit}
      onSaved={onQuerySave}
      onSavedQueryUpdated={onQuerySave}
      onClearSavedQuery={onClearSavedQuery}
      showSaveQuery
      showQueryInput
      onFiltersUpdated={onFilterChange}
    />
  );
};
