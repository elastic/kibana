/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { BoolQuery, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useKibana } from '../../..';
import { useAlertSearchBarStateContainer } from './use_alert_search_bar_state_container';
import { ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY } from './constants';
import { AlertsSearchBarProps } from './types';
import AlertsSearchBar from './alerts_search_bar';
import { buildEsQuery } from './build_es_query';

const INVALID_QUERY_STRING_TOAST_TITLE = i18n.translate(
  'xpack.triggersActionsUI.urlSyncedAlertsSearchBar.invalidQueryTitle',
  {
    defaultMessage: 'Invalid query string',
  }
);

export interface UrlSyncedAlertsSearchBarProps
  extends Omit<
    AlertsSearchBarProps,
    'query' | 'rangeFrom' | 'rangeTo' | 'filters' | 'onQuerySubmit'
  > {
  showFilterControls?: boolean;
  onEsQueryChange: (esQuery: { bool: BoolQuery }) => void;
  onFilterSelected?: (filters: Filter[]) => void;
}

/**
 * An abstraction over AlertsSearchBar that syncs the query state with the url
 */
export const UrlSyncedAlertsSearchBar = ({
  ruleTypeIds,
  showFilterControls = false,
  onEsQueryChange,
  onFilterSelected,
  ...rest
}: UrlSyncedAlertsSearchBarProps) => {
  const {
    http,
    data: { query: queryService },
    notifications,
    dataViews,
    spaces,
  } = useKibana().services;
  const { toasts } = notifications;
  const {
    timefilter: { timefilter: timeFilterService },
  } = queryService;
  const [spaceId, setSpaceId] = useState<string>();

  const {
    // KQL bar query
    kuery,
    onKueryChange,
    // KQL bar filters
    filters,
    onFiltersChange,
    // Controls bar filters
    controlFilters,
    onControlFiltersChange,
    // Time range
    rangeFrom,
    onRangeFromChange,
    rangeTo,
    onRangeToChange,
    // Controls bar configuration
    filterControls,
    // Saved KQL query
    savedQuery,
    setSavedQuery,
    clearSavedQuery,
  } = useAlertSearchBarStateContainer(ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY);

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  useEffect(() => {
    try {
      onEsQueryChange(
        buildEsQuery({
          timeRange: {
            to: rangeTo,
            from: rangeFrom,
          },
          kuery,
          filters: [...filters, ...controlFilters],
        })
      );

      onFilterSelected?.(filters);
    } catch (error) {
      toasts.addError(error, {
        title: INVALID_QUERY_STRING_TOAST_TITLE,
      });
      onKueryChange('');
    }
  }, [
    controlFilters,
    filters,
    kuery,
    onEsQueryChange,
    onFilterSelected,
    onKueryChange,
    rangeFrom,
    rangeTo,
    toasts,
  ]);

  const onQueryChange = useCallback<NonNullable<AlertsSearchBarProps['onQueryChange']>>(
    ({ query, dateRange }) => {
      setSavedQuery(undefined);
      timeFilterService.setTime(dateRange);
      onKueryChange(query ?? '');
      onRangeFromChange(dateRange.from);
      onRangeToChange(dateRange.to);
    },
    [onKueryChange, onRangeFromChange, onRangeToChange, setSavedQuery, timeFilterService]
  );

  const filterControlsStorageKey = useMemo(
    () => ['alertsSearchBar', spaceId, 'filterControls'].filter(Boolean).join('.'),
    [spaceId]
  );

  return (
    <>
      <AlertsSearchBar
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        query={kuery}
        onQuerySubmit={onQueryChange}
        filters={filters}
        onFiltersUpdated={onFiltersChange}
        savedQuery={savedQuery}
        onSavedQueryUpdated={setSavedQuery}
        onClearSavedQuery={clearSavedQuery}
        ruleTypeIds={ruleTypeIds}
        {...rest}
      />
      {showFilterControls && (
        <AlertFilterControls
          dataViewSpec={{
            id: 'unified-alerts-dv',
            title: '.alerts-*',
          }}
          spaceId={spaceId}
          chainingSystem="HIERARCHICAL"
          controlsUrlState={filterControls}
          filters={controlFilters}
          onFiltersChange={onControlFiltersChange}
          storageKey={filterControlsStorageKey}
          services={{
            http,
            notifications,
            dataViews,
            storage: Storage,
          }}
          ControlGroupRenderer={ControlGroupRenderer}
        />
      )}
    </>
  );
};
