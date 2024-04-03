/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { Filter, Query } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { AlertsStatusFilter } from './components';
import { observabilityAlertFeatureIds } from '../../../common/constants';
import { ALERT_STATUS_QUERY, DEFAULT_QUERIES, DEFAULT_QUERY_STRING } from './constants';
import { ObservabilityAlertSearchBarProps } from './types';
import { buildEsQuery } from '../../utils/build_es_query';
import { AlertStatus } from '../../../common/typings';

const getAlertStatusQuery = (status: string): Query[] => {
  return ALERT_STATUS_QUERY[status]
    ? [{ query: ALERT_STATUS_QUERY[status], language: 'kuery' }]
    : [];
};
const toastTitle = i18n.translate('xpack.observability.alerts.searchBar.invalidQueryTitle', {
  defaultMessage: 'Invalid query string',
});
const defaultFilters: Filter[] = [];

export function ObservabilityAlertSearchBar({
  appName,
  defaultSearchQueries = DEFAULT_QUERIES,
  onEsQueryChange,
  onKueryChange,
  onRangeFromChange,
  onRangeToChange,
  onStatusChange,
  onFiltersChange,
  showFilterBar = false,
  filters = defaultFilters,
  savedQuery,
  setSavedQuery,
  kuery,
  rangeFrom,
  rangeTo,
  services: { AlertsSearchBar, timeFilterService, useToasts, uiSettings },
  status,
}: ObservabilityAlertSearchBarProps) {
  const toasts = useToasts();

  const clearSavedQuery = useCallback(
    () => (setSavedQuery ? setSavedQuery(undefined) : null),
    [setSavedQuery]
  );
  const onAlertStatusChange = useCallback(
    (alertStatus: AlertStatus) => {
      try {
        onEsQueryChange(
          buildEsQuery({
            timeRange: {
              to: rangeTo,
              from: rangeFrom,
            },
            kuery,
            queries: [...getAlertStatusQuery(alertStatus), ...defaultSearchQueries],
            config: getEsQueryConfig(uiSettings),
          })
        );
      } catch (error) {
        toasts.addError(error, {
          title: toastTitle,
        });
        onKueryChange(DEFAULT_QUERY_STRING);
      }
    },
    [
      onEsQueryChange,
      rangeTo,
      rangeFrom,
      kuery,
      defaultSearchQueries,
      uiSettings,
      toasts,
      onKueryChange,
    ]
  );

  useEffect(() => {
    onAlertStatusChange(status);
  }, [onAlertStatusChange, status]);

  useEffect(() => {
    try {
      onEsQueryChange(
        buildEsQuery({
          timeRange: {
            to: rangeTo,
            from: rangeFrom,
          },
          kuery,
          queries: [...getAlertStatusQuery(status), ...defaultSearchQueries],
          filters,
        })
      );
    } catch (error) {
      toasts.addError(error, {
        title: toastTitle,
      });
      onKueryChange(DEFAULT_QUERY_STRING);
    }
  }, [
    defaultSearchQueries,
    filters,
    kuery,
    onEsQueryChange,
    onKueryChange,
    rangeFrom,
    rangeTo,
    status,
    toasts,
  ]);

  const onSearchBarParamsChange = useCallback<
    (query: {
      dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
      query?: string;
    }) => void
  >(
    ({ dateRange, query }) => {
      clearSavedQuery();
      onKueryChange(query ?? '');
      timeFilterService.setTime(dateRange);
      onRangeFromChange(dateRange.from);
      onRangeToChange(dateRange.to);
    },
    [onKueryChange, timeFilterService, clearSavedQuery, onRangeFromChange, onRangeToChange]
  );

  const onFilterUpdated = useCallback<(filters: Filter[]) => void>(
    (updatedFilters) => {
      clearSavedQuery();
      onFiltersChange?.(updatedFilters);
    },
    [clearSavedQuery, onFiltersChange]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <AlertsSearchBar
          appName={appName}
          featureIds={observabilityAlertFeatureIds}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          showFilterBar={showFilterBar}
          filters={filters}
          onFiltersUpdated={onFilterUpdated}
          savedQuery={savedQuery}
          onSavedQueryUpdated={setSavedQuery}
          onClearSavedQuery={clearSavedQuery}
          query={kuery}
          onQuerySubmit={onSearchBarParamsChange}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertsStatusFilter status={status} onChange={onStatusChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default ObservabilityAlertSearchBar;
