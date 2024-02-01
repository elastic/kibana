/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { BoolQuery } from '@kbn/es-query';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsFeatureIdsFilter } from '../../lib/search_filters';
import { useKibana } from '../../..';
import { useAlertSearchBarStateContainer } from './use_alert_search_bar_state_container';
import { ALERTS_URL_STORAGE_KEY } from './constants';
import { AlertsSearchBarProps } from './types';
import AlertsSearchBar from './alerts_search_bar';
import { buildEsQuery } from '../global_alerts_page/global_alerts_page';
import { nonNullable } from '../../../../common/utils';

export type UrlSyncedAlertsSearchBarProps = Omit<
  AlertsSearchBarProps,
  'query' | 'rangeFrom' | 'rangeTo' | 'filters' | 'onQuerySubmit'
> & {
  onEsQueryChange: (esQuery: { bool: BoolQuery }) => void;
  onActiveFeatureFiltersChange?: (value: AlertConsumers[]) => void;
};

/**
 * An abstraction over AlertsSearchBar that syncs the query state with the url
 */
export const UrlSyncedAlertsSearchBar = ({
  onEsQueryChange,
  onActiveFeatureFiltersChange,
  ...rest
}: UrlSyncedAlertsSearchBarProps) => {
  const {
    data: { query: queryService },
  } = useKibana().services;
  const {
    timefilter: { timefilter: timeFilterService },
  } = queryService;
  const {
    kuery,
    rangeFrom,
    rangeTo,
    filters,
    onKueryChange,
    onRangeFromChange,
    onRangeToChange,
    onFiltersChange,
    savedQuery,
    setSavedQuery,
    clearSavedQuery,
  } = useAlertSearchBarStateContainer(ALERTS_URL_STORAGE_KEY);

  const syncEsQuery = useCallback(() => {
    try {
      onActiveFeatureFiltersChange?.([
        ...new Set(
          filters
            .flatMap((f) => (f as AlertsFeatureIdsFilter).meta.alertsFeatureIds)
            .filter(nonNullable)
        ),
      ]);
      const newQuery = buildEsQuery({
        timeRange: {
          to: rangeTo,
          from: rangeFrom,
        },
        kuery,
        filters,
      });
      onEsQueryChange(newQuery);
    } catch (e) {
      // TODO show error message?
    }
  }, [filters, kuery, onActiveFeatureFiltersChange, onEsQueryChange, rangeFrom, rangeTo]);

  useEffect(() => {
    syncEsQuery();
  }, [syncEsQuery]);

  const onQueryChange = useCallback<NonNullable<AlertsSearchBarProps['onQueryChange']>>(
    ({ query, dateRange }) => {
      setSavedQuery(undefined);
      timeFilterService.setTime(dateRange);
      onKueryChange(query ?? '');
      onRangeFromChange(dateRange.from);
      onRangeToChange(dateRange.to);

      syncEsQuery();
    },
    [
      onKueryChange,
      onRangeFromChange,
      onRangeToChange,
      setSavedQuery,
      syncEsQuery,
      timeFilterService,
    ]
  );

  return (
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
      {...rest}
    />
  );
};
