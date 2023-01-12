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
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import type { InfraClientStartDeps } from '../../../../types';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { ControlsContent } from './controls_content';

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
    controlPanelFilters,
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

  const onPanelFiltersChange = (panelFilters: Filter[]) => {
    // <ControlsContent /> triggers this event 2 times during its loading lifecycle
    if (!deepEqual(controlPanelFilters, panelFilters)) {
      onQueryChange({ panelFilters });
    }
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
    panelFilters,
  }: {
    payload?: { dateRange: TimeRange; query?: Query };
    filters?: Filter[];
    panelFilters?: Filter[];
  }) => {
    onSubmit({ query: payload?.query, dateRange: payload?.dateRange, filters, panelFilters });
  };

  return (
    <EuiFlexGrid gutterSize="s">
      <SearchBar
        appName={'Infra Hosts'}
        placeholder={i18n.translate('xpack.infra.hosts.searchPlaceholder', {
          defaultMessage: 'Search hosts (E.g. cloud.provider:gcp AND system.load.1 > 0.5)',
        })}
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
        displayStyle="inPage"
      />
      <ControlsContent
        timeRange={unifiedSearchDateRange}
        dataView={dataView}
        query={unifiedSearchQuery}
        filters={unifiedSearchFilters}
        onFilterChange={onPanelFiltersChange}
      />
    </EuiFlexGrid>
  );
};
